package com.smartwardrobe;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
@org.springframework.context.annotation.DependsOn("wardrobeMigration")
public class WardrobeStore {
    static final Set<String> CATEGORIES = Set.of("Shirt", "T-shirt", "Hoodie", "Traditional", "Pants", "Shoes");
    static final Set<String> TOPS = Set.of("Shirt", "T-shirt", "Hoodie", "Traditional");
    static final Set<String> STYLES = Set.of("Formal", "Semi-formal", "Casual", "Traditional");
    static List<String> styles(List<String> styles, String category) {
        return styles==null ? List.of("Traditional".equals(category)?"Traditional":"Casual") : styles;
    }
    static boolean suitable(String category, String style) {
        return switch(category) {
            case "T-shirt" -> style.equals("Casual") || style.equals("Semi-formal");
            case "Hoodie" -> style.equals("Casual");
            case "Traditional" -> style.equals("Traditional");
            case "Shirt" -> !style.equals("Traditional");
            default -> true;
        };
    }
    static boolean validOutfit(List<String> categories) {
        return categories.stream().filter(TOPS::contains).count()==1 && Collections.frequency(categories,"Pants")==1 && Collections.frequency(categories,"Shoes")==categories.size()-2;
    }
    static final Set<String> COLORS = Set.of("White","Black","Grey","Navy","Blue","Beige","Brown","Green","Red","Pink","Purple","Yellow","Orange");
    static final Set<String> OCCASIONS = Set.of("College","Office","Party","Friends","Date","Everyday","Outing");
    static final Set<String> PATTERNS = Set.of("Solid","Striped","Checked","Printed");
    final JdbcTemplate db;
    public WardrobeStore(JdbcTemplate db) { this.db = db; }
    public record Item(String id, String name, String category, String color, String pattern, List<String> occasions, String photo, boolean laundry, boolean archived, String createdAt, List<String> styles) {}
    public record ItemInput(String name, String category, String color, String pattern, List<String> occasions, String photo, List<String> styles) {}
    public record WornItem(String id, String name, String category) {}
    public record Wear(String id, String wornAt, String occasion, List<WornItem> items, String dressStyle) {}
    public record WearInput(List<String> itemIds, String occasion, String wornAt, String dressStyle) {}
    public record Snapshot(int version, List<Item> items, List<Wear> history) {}
    static void require(boolean valid, String message) { if (!valid) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private final org.springframework.jdbc.core.RowMapper<Item> itemMapper = (r,n) -> new Item(r.getString("id"),r.getString("name"),r.getString("category"),r.getString("color"),r.getString("pattern"),List.of(r.getString("occasions").split(",")),r.getString("photo"),r.getBoolean("laundry"),r.getBoolean("archived"),r.getString("created_at"),List.of(r.getString("styles").split(",")));
    public List<Item> items() {
        return db.query("SELECT * FROM wardrobe_item ORDER BY created_at DESC", itemMapper);
    }
    Item find(String id) {
        return db.query("SELECT * FROM wardrobe_item WHERE id=?",itemMapper,id).stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Item not found"));
    }
    static void validate(ItemInput i) {
        require(i != null && i.name()!=null && !i.name().isBlank() && i.name().trim().length()<=80,"Enter a name of 1–80 characters");
        require(CATEGORIES.contains(Objects.toString(i.category(),"")),"Choose a valid category");
        require(COLORS.contains(Objects.toString(i.color(),"")),"Choose a valid color");
        require(PATTERNS.contains(Objects.toString(i.pattern(),"")),"Choose a valid pattern");
        require(i.occasions()!=null && !i.occasions().isEmpty() && i.occasions().size()<=7 && i.occasions().stream().allMatch(o -> o!=null && OCCASIONS.contains(o)),"Choose at least one valid occasion");
        var tags=styles(i.styles(),i.category());
        require(!tags.isEmpty() && tags.size()<=4 && tags.stream().allMatch(t -> t!=null && STYLES.contains(t) && suitable(i.category(),t)),"Choose valid dress styles for this category");
        require(i.photo()!=null && i.photo().length()<=2_000_000 && Pattern.matches("data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+",i.photo()),"Add a JPEG, PNG, or WebP photo under 1.5 MB");
        try {
            byte[] bytes=Base64.getDecoder().decode(i.photo().substring(i.photo().indexOf(',')+1));
            try (var stream=javax.imageio.ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(bytes))) {
                var readers=javax.imageio.ImageIO.getImageReaders(stream);
                require(readers.hasNext(),"Photo must be a valid JPEG or PNG image");
                var reader=readers.next();
                try {
                    reader.setInput(stream);
                    require(reader.getWidth(0)<=2000 && reader.getHeight(0)<=2000,"Photo must be up to 2000 pixels per side");
                    require(reader.read(0)!=null,"Invalid photo");
                } finally { reader.dispose(); }
            }
        } catch (java.io.IOException | IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid photo"); }
    }
    @Transactional
    public Item create(ItemInput i) {
        validate(i); String id=UUID.randomUUID().toString();
        db.update("INSERT INTO wardrobe_item (id,name,category,color,pattern,occasions,photo,created_at,styles) VALUES (?,?,?,?,?,?,?,?,?)",id,i.name().trim(),i.category(),i.color(),i.pattern(),String.join(",",new LinkedHashSet<>(i.occasions())),i.photo(),Instant.now().toString(),String.join(",",styles(i.styles(),i.category())));
        return find(id);
    }
    public record BulkInput(String requestId, List<ItemInput> items) {}
    @Transactional
    public List<Item> createBulk(BulkInput input) {
        require(input!=null && input.requestId()!=null && input.items()!=null && !input.items().isEmpty() && input.items().size()<=24,"Choose between 1 and 24 pieces");
        try { require(UUID.fromString(input.requestId()).toString().equals(input.requestId()),"Invalid import identifier"); }
        catch(IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid import identifier"); }
        input.items().forEach(WardrobeStore::validate);
        require(input.items().stream().mapToLong(i -> i.photo().length()).sum()<=16_000_000,"This batch is too large. Import fewer pieces at a time");
        String fingerprint;
        try {
            byte[] bytes=new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(input.items());
            fingerprint=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch(Exception e) { throw new IllegalStateException("Cannot fingerprint import",e); }
        var existing=db.queryForList("SELECT fingerprint,item_ids FROM bulk_import WHERE request_id=?",input.requestId());
        if(!existing.isEmpty()) {
            require(fingerprint.equals(existing.get(0).get("FINGERPRINT")),"This import was already saved with a different selection");
            return Arrays.stream(existing.get(0).get("ITEM_IDS").toString().split(",")).map(this::find).toList();
        }
        // Reserve the request before inserting items. A concurrent retry rolls back safely.
        try { db.update("INSERT INTO bulk_import (request_id,fingerprint,item_ids) VALUES (?,?,?)",input.requestId(),fingerprint,""); }
        catch(org.springframework.dao.DuplicateKeyException e) { throw new ResponseStatusException(HttpStatus.CONFLICT,"This import is already being saved. Retry in a moment"); }
        var saved=input.items().stream().map(this::create).toList();
        db.update("UPDATE bulk_import SET item_ids=? WHERE request_id=?",String.join(",",saved.stream().map(Item::id).toList()),input.requestId());
        return saved;
    }
    @Transactional
    public Item update(String id, ItemInput i) {
        find(id); validate(i);
        db.update("UPDATE wardrobe_item SET name=?,category=?,color=?,pattern=?,occasions=?,photo=?,styles=? WHERE id=?",i.name().trim(),i.category(),i.color(),i.pattern(),String.join(",",new LinkedHashSet<>(i.occasions())),i.photo(),String.join(",",styles(i.styles(),i.category())),id);
        return find(id);
    }
    @Transactional
    public Item laundry(String id, boolean value) {
        Item item=find(id); require(!item.archived(),"Restore this item before changing its laundry status");
        if(item.laundry()!=value) {
            db.update("UPDATE wardrobe_item SET laundry=? WHERE id=?",value,id);
            db.update("INSERT INTO laundry_event (item_id,changed_at,in_laundry) VALUES (?,?,?)",id,Instant.now().toString(),value);
        }
        return find(id);
    }
    @Transactional
    public Item archive(String id, boolean value) { find(id); db.update("UPDATE wardrobe_item SET archived=? WHERE id=?",value,id); return find(id); }
    public List<Wear> history() {
        return db.query("SELECT * FROM wear_event ORDER BY CAST(worn_at AS TIMESTAMP WITH TIME ZONE) DESC", (r,n) -> new Wear(r.getString("id"),r.getString("worn_at"),r.getString("occasion"),db.query("SELECT * FROM wear_item WHERE event_id=? ORDER BY category_snapshot",(w,k)-> new WornItem(w.getString("item_id"),w.getString("name_snapshot"),w.getString("category_snapshot")),r.getString("id")),r.getString("dress_style")));
    }
    @Transactional
    public Wear wear(WearInput input) {
        require(input!=null && input.itemIds()!=null && input.itemIds().size()>=2 && input.itemIds().size()<=3 && new HashSet<>(input.itemIds()).size()==input.itemIds().size(),"Select one top, one pair of pants, and optionally shoes");
        require(OCCASIONS.contains(Objects.toString(input.occasion(),"")),"Choose a valid occasion");
        Instant time;
        try { time=Instant.parse(input.wornAt()); } catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a valid wear time"); }
        require(!time.isAfter(Instant.now().plusSeconds(60)),"Wear time cannot be in the future");
        List<Item> chosen=input.itemIds().stream().map(this::find).toList();
        require(chosen.stream().noneMatch(i -> i.archived() || i.laundry()),"This outfit contains unavailable items");
        require(validOutfit(chosen.stream().map(Item::category).toList()),"Choose one top, one pair of pants, and optionally shoes");
        String dressStyle=input.dressStyle()==null?"Casual":input.dressStyle();
        require(STYLES.contains(dressStyle),"Choose a valid dress style");
        require(chosen.stream().allMatch(i -> i.styles().contains(dressStyle) && suitable(i.category(),dressStyle)),"An item does not suit the selected dress style");
        require(chosen.stream().allMatch(i -> i.occasions().contains(input.occasion()) || i.occasions().contains("Everyday")),"An item does not suit the selected occasion");
        String id=UUID.randomUUID().toString();
        db.update("INSERT INTO wear_event (id,worn_at,occasion,dress_style) VALUES (?,?,?,?)",id,time.toString(),input.occasion(),dressStyle);
        for(Item i:chosen) db.update("INSERT INTO wear_item VALUES (?,?,?,?)",id,i.id(),i.name(),i.category());
        return history().stream().filter(w->w.id().equals(id)).findFirst().orElseThrow();
    }
    @Transactional(readOnly=true)
    public Snapshot snapshot() { return new Snapshot(2,items(),history()); }
    @Transactional
    public Map<String,Integer> restore(Snapshot data) {
        require(data!=null && (data.version()==1 || data.version()==2) && data.items()!=null && data.history()!=null && data.items().size()<=1000 && data.history().size()<=10000,"Unsupported backup or backup too large");
        Set<String> ids=new HashSet<>();
        for(Item i:data.items()) {
            require(i!=null && i.id()!=null && i.createdAt()!=null,"Invalid backup item");
            try { UUID.fromString(i.id()); Instant.parse(i.createdAt()); } catch(Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid backup item identifier or date"); }
            require(ids.add(i.id()),"Duplicate backup item"); validate(new ItemInput(i.name(),i.category(),i.color(),i.pattern(),i.occasions(),i.photo(),i.styles()));
        }
        int added=0,events=0;
        for(Item i:data.items()) if(db.queryForObject("SELECT COUNT(*) FROM wardrobe_item WHERE id=?",Integer.class,i.id())==0) {
            db.update("INSERT INTO wardrobe_item (id,name,category,color,pattern,occasions,photo,laundry,archived,created_at,styles) VALUES (?,?,?,?,?,?,?,?,?,?,?)",i.id(),i.name().trim(),i.category(),i.color(),i.pattern(),String.join(",",i.occasions()),i.photo(),i.laundry(),i.archived(),i.createdAt(),String.join(",",styles(i.styles(),i.category()))); added++;
        }
        Set<String> wearIds=new HashSet<>();
        for(Wear w:data.history()) {
            require(w!=null && w.id()!=null && w.items()!=null && w.items().size()>=2 && w.items().size()<=3 && w.items().stream().allMatch(Objects::nonNull) && OCCASIONS.contains(Objects.toString(w.occasion(),"")),"Invalid backup wear event");
            try { UUID.fromString(w.id()); require(w.wornAt()!=null,"Missing backup event date"); require(!Instant.parse(w.wornAt()).isAfter(Instant.now().plusSeconds(60)),"Backup contains a future wear event"); } catch(IllegalArgumentException | java.time.format.DateTimeParseException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid backup event identifier or date"); }
            require(wearIds.add(w.id()) && w.items().stream().map(WornItem::id).distinct().count()==w.items().size() && w.items().stream().allMatch(wi -> wi.category()!=null && CATEGORIES.contains(wi.category())) && validOutfit(w.items().stream().map(WornItem::category).toList()),"Invalid backup outfit");
            for(WornItem wi:w.items()) { require(wi.name()!=null && !wi.name().isBlank() && wi.name().length()<=80,"Invalid backup item name"); find(wi.id()); }
            require(w.dressStyle()==null || STYLES.contains(w.dressStyle()),"Invalid backup dress style");
            if(db.queryForObject("SELECT COUNT(*) FROM wear_event WHERE id=?",Integer.class,w.id())==0) {
                db.update("INSERT INTO wear_event (id,worn_at,occasion,dress_style) VALUES (?,?,?,?)",w.id(),w.wornAt(),w.occasion(),w.dressStyle()==null?"Casual":w.dressStyle());
                for(WornItem wi:w.items()) db.update("INSERT INTO wear_item VALUES (?,?,?,?)",w.id(),wi.id(),wi.name(),wi.category()); events++;
            }
        }
        return Map.of("itemsAdded",added,"eventsAdded",events);
    }
}
