package com.smartwardrobe;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:wardrobetest;DB_CLOSE_DELAY=-1"})
@AutoConfigureMockMvc
class WardrobeIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    String photo;
    @BeforeEach void reset() throws Exception {
        db.update("DELETE FROM bulk_import"); db.update("DELETE FROM wear_item"); db.update("DELETE FROM wear_event"); db.update("DELETE FROM laundry_event"); db.update("DELETE FROM wardrobe_item");
        var bytes=new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(10,10,BufferedImage.TYPE_INT_RGB),"png",bytes); photo="data:image/png;base64,"+Base64.getEncoder().encodeToString(bytes.toByteArray());
    }
    Map<String,Object> input(String name,String cat) { return new LinkedHashMap<>(Map.of("name",name,"category",cat,"color","Blue","pattern","Solid","occasions",List.of("Everyday"),"photo",photo)); }
    JsonNode create(String name,String cat) throws Exception { return json.readTree(mvc.perform(post("/api/items").contentType("application/json").content(json.writeValueAsString(input(name,cat)))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()); }
    List<String> outfit() throws Exception { return List.of(create("College shirt","Shirt").get("id").asText(),create("Jeans","Pants").get("id").asText(),create("Sneakers","Shoes").get("id").asText()); }
    Map<String,Object> wear(List<String> ids,String occasion,int days) { return Map.of("itemIds",ids,"occasion",occasion,"wornAt",Instant.now().minusSeconds(days*86400L).toString()); }
    @Test void fullWorkflowKeepsItemHistoryAfterLaundryAndRename() throws Exception {
        var ids=outfit();
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids,"College",5)))).andExpect(status().isCreated());
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids,"Party",0)))).andExpect(status().isCreated());
        mvc.perform(patch("/api/items/"+ids.get(0)+"/laundry").contentType("application/json").content("{\"value\":true}")).andExpect(status().isOk()).andExpect(jsonPath("$.laundry").value(true));
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids,"Friends",0)))).andExpect(status().isBadRequest());
        mvc.perform(patch("/api/items/"+ids.get(0)+"/laundry").contentType("application/json").content("{\"value\":false}")).andExpect(status().isOk());
        mvc.perform(put("/api/items/"+ids.get(0)).contentType("application/json").content(json.writeValueAsString(input("Renamed shirt","Shirt")))).andExpect(status().isOk());
        mvc.perform(get("/api/history")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].occasion").value("Party"));
        assertEquals(2,db.queryForObject("SELECT COUNT(*) FROM wear_item WHERE item_id=? AND name_snapshot='College shirt'",Integer.class,ids.get(0)));
        assertEquals(2,db.queryForObject("SELECT COUNT(*) FROM laundry_event",Integer.class));
    }
    @Test void rejectsInvalidPhotosCategoriesFutureTimesAndPartialOutfits() throws Exception {
        var bad=input("Bad","Shirt");bad.put("photo","data:image/png;base64,AAAA");
        mvc.perform(post("/api/items").contentType("application/json").content(json.writeValueAsString(bad))).andExpect(status().isBadRequest());
        bad=input("Bad","Hat");mvc.perform(post("/api/items").contentType("application/json").content(json.writeValueAsString(bad))).andExpect(status().isBadRequest());
        var ids=outfit(); var future=new LinkedHashMap<>(wear(ids,"College",0));future.put("wornAt",Instant.now().plusSeconds(3600).toString());
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(future))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids.subList(0,1),"College",0)))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(List.of(ids.get(0),ids.get(0),ids.get(2)),"College",0)))).andExpect(status().isBadRequest());
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM wear_event",Integer.class));
    }
    @Test void archivePreservesHistoryAndCanBeReversed() throws Exception {
        var ids=outfit();mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids,"College",0)))).andExpect(status().isCreated());
        mvc.perform(patch("/api/items/"+ids.get(0)+"/archive").contentType("application/json").content("{\"value\":true}")).andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(true));
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids,"College",0)))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/history")).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(patch("/api/items/"+ids.get(0)+"/archive").contentType("application/json").content("{\"value\":false}")).andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(false));
    }
    @Test void backupsRoundTripWithoutOverwritingExistingRecords() throws Exception {
        var ids=outfit();mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids,"Party",2)))).andExpect(status().isCreated());
        String backup=mvc.perform(get("/api/backup")).andReturn().getResponse().getContentAsString();
        mvc.perform(post("/api/restore").contentType("application/json").content(backup)).andExpect(status().isOk()).andExpect(jsonPath("$.itemsAdded").value(0)).andExpect(jsonPath("$.eventsAdded").value(0));
        db.update("DELETE FROM wear_item"); db.update("DELETE FROM wear_event"); db.update("DELETE FROM wardrobe_item");
        mvc.perform(post("/api/restore").contentType("application/json").content(backup)).andExpect(status().isOk()).andExpect(jsonPath("$.itemsAdded").value(3)).andExpect(jsonPath("$.eventsAdded").value(1));
        mvc.perform(put("/api/items/"+ids.get(0)).contentType("application/json").content(json.writeValueAsString(input("Keep updated name","Shirt")))).andExpect(status().isOk());
        mvc.perform(post("/api/restore").contentType("application/json").content(backup)).andExpect(status().isOk());
        assertEquals("Keep updated name",db.queryForObject("SELECT name FROM wardrobe_item WHERE id=?",String.class,ids.get(0)));
    }
    @Test void malformedRestoreRollsBackAllAdditions() throws Exception {
        var ids=outfit();mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids,"College",1)))).andExpect(status().isCreated());
        var backup=(com.fasterxml.jackson.databind.node.ObjectNode)json.readTree(mvc.perform(get("/api/backup")).andReturn().getResponse().getContentAsString());
        ((com.fasterxml.jackson.databind.node.ObjectNode)backup.get("history").get(0)).put("occasion","Unknown");
        db.update("DELETE FROM wear_item");db.update("DELETE FROM wear_event");db.update("DELETE FROM wardrobe_item");
        mvc.perform(post("/api/restore").contentType("application/json").content(backup.toString())).andExpect(status().isBadRequest());
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM wardrobe_item",Integer.class));
    }
    @Test void rejectsCrossOriginWritesAndUnknownIds() throws Exception {
        mvc.perform(post("/api/items").header("Origin","https://other.example").contentType("application/json").content(json.writeValueAsString(input("No","Shirt")))).andExpect(status().isForbidden());
        mvc.perform(patch("/api/items/missing/laundry").contentType("application/json").content("{\"value\":true}")).andExpect(status().isNotFound());
        mvc.perform(patch("/api/items/missing/laundry").contentType("application/json").content("{}")).andExpect(status().isBadRequest());
    }
    @Test void tShirtOutfitsPersistStyleAndRejectFormalMisclassification() throws Exception {
        String tee=create("Blue T-shirt","T-shirt").get("id").asText();
        String pants=create("Casual pants","Pants").get("id").asText();
        var body=new LinkedHashMap<>(wear(List.of(tee,pants),"Outing",0));
        body.put("dressStyle","Casual");
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isCreated()).andExpect(jsonPath("$.dressStyle").value("Casual")).andExpect(jsonPath("$.items.length()").value(2));
        body.put("dressStyle","Formal");
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        var bad=input("Incorrect formal tee","T-shirt");bad.put("styles",List.of("Formal"));
        mvc.perform(post("/api/items").contentType("application/json").content(json.writeValueAsString(bad))).andExpect(status().isBadRequest());
    }
    @Test void formalDressTagsPersistAndRoundTripInBackups() throws Exception {
        var ids=new ArrayList<String>();
        for(String category:List.of("Shirt","Pants","Shoes")) {
            var data=input("Formal "+category,category);data.put("styles",List.of("Formal","Semi-formal"));
            var response=mvc.perform(post("/api/items").contentType("application/json").content(json.writeValueAsString(data))).andExpect(status().isCreated()).andExpect(jsonPath("$.styles[0]").value("Formal")).andReturn();
            ids.add(json.readTree(response.getResponse().getContentAsString()).get("id").asText());
        }
        var body=new LinkedHashMap<>(wear(ids,"Office",0));body.put("dressStyle","Formal");
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isCreated());
        String backup=mvc.perform(get("/api/backup")).andExpect(jsonPath("$.version").value(2)).andReturn().getResponse().getContentAsString();
        db.update("DELETE FROM wear_item");db.update("DELETE FROM wear_event");db.update("DELETE FROM wardrobe_item");
        mvc.perform(post("/api/restore").contentType("application/json").content(backup)).andExpect(status().isOk()).andExpect(jsonPath("$.itemsAdded").value(3));
        mvc.perform(get("/api/history")).andExpect(jsonPath("$[0].dressStyle").value("Formal"));
        assertEquals("Formal,Semi-formal",db.queryForObject("SELECT styles FROM wardrobe_item WHERE id=?",String.class,ids.get(0)));
    }
    @Test void phaseOneBackupRemainsRestorable() throws Exception {
        var ids=outfit();mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids,"College",1)))).andExpect(status().isCreated());
        var backup=(com.fasterxml.jackson.databind.node.ObjectNode)json.readTree(mvc.perform(get("/api/backup")).andReturn().getResponse().getContentAsString());
        backup.put("version",1);
        for(var item:backup.get("items"))((com.fasterxml.jackson.databind.node.ObjectNode)item).remove("styles");
        for(var event:backup.get("history"))((com.fasterxml.jackson.databind.node.ObjectNode)event).remove("dressStyle");
        db.update("DELETE FROM wear_item");db.update("DELETE FROM wear_event");db.update("DELETE FROM wardrobe_item");
        mvc.perform(post("/api/restore").contentType("application/json").content(backup.toString())).andExpect(status().isOk());
        mvc.perform(get("/api/items")).andExpect(jsonPath("$[0].styles[0]").value("Casual"));
        mvc.perform(get("/api/history")).andExpect(jsonPath("$[0].dressStyle").value("Casual"));
    }
    @Test void phaseOneDatabaseMigrationPreservesRowsAndRunsTwice() {
        var source=new org.springframework.jdbc.datasource.DriverManagerDataSource("jdbc:h2:mem:legacy"+UUID.randomUUID()+";DB_CLOSE_DELAY=-1","sa","");
        new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(new org.springframework.core.io.ClassPathResource("schema-v1.sql")).execute(source);
        var legacy=new JdbcTemplate(source);
        legacy.update("INSERT INTO wardrobe_item VALUES (?,?,?,?,?,?,?,?,?,?)","legacy","Keep this shirt","Shirt","Blue","Solid","Everyday",photo,true,false,Instant.now().toString());
        legacy.update("INSERT INTO wear_event VALUES (?,?,?)","event",Instant.now().toString(),"College");
        legacy.update("INSERT INTO wear_item VALUES (?,?,?,?)","event","legacy","Keep this shirt","Shirt");
        new WardrobeMigration(legacy).afterPropertiesSet();new WardrobeMigration(legacy).afterPropertiesSet();
        assertEquals("Casual",legacy.queryForObject("SELECT styles FROM wardrobe_item WHERE id='legacy'",String.class));
        assertEquals(true,legacy.queryForObject("SELECT laundry FROM wardrobe_item WHERE id='legacy'",Boolean.class));
        assertEquals("Casual",legacy.queryForObject("SELECT dress_style FROM wear_event",String.class));
        assertEquals(1,legacy.queryForObject("SELECT COUNT(*) FROM wear_item",Integer.class));
        legacy.update("UPDATE wardrobe_item SET category='T-shirt' WHERE id='legacy'");
        legacy.execute("SHUTDOWN");
    }


    @Test void bulkImportPersistsIndependentItemsAndRetryDoesNotDuplicate() throws Exception {
        var request=new LinkedHashMap<String,Object>(); request.put("requestId",UUID.randomUUID().toString());
        request.put("items",List.of(input("Blue jeans","Pants"),input("Black jeans","Pants")));
        String body=json.writeValueAsString(request);
        String first=mvc.perform(post("/api/items/bulk").contentType("application/json").content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.length()").value(2)).andReturn().getResponse().getContentAsString();
        String retry=mvc.perform(post("/api/items/bulk").contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        assertEquals(json.readTree(first),json.readTree(retry));
        assertEquals(2,db.queryForObject("SELECT COUNT(*) FROM wardrobe_item",Integer.class));
        request.put("items",List.of(input("Different selection","Shirt")));
        mvc.perform(post("/api/items/bulk").contentType("application/json").content(json.writeValueAsString(request))).andExpect(status().isBadRequest());
        assertEquals(2,db.queryForObject("SELECT COUNT(*) FROM wardrobe_item",Integer.class));
    }
    @Test void bulkImportRejectsInvalidOrOversizedBatchesWithoutSavingAnything() throws Exception {
        var bad=input("Bad","Pants");bad.put("photo","invalid");
        for(var rows:List.of(List.of(input("Good","Pants"),bad),Collections.nCopies(25,input("Too many","Shirt")),List.of())) {
            mvc.perform(post("/api/items/bulk").contentType("application/json").content(json.writeValueAsString(Map.of("requestId",UUID.randomUUID().toString(),"items",rows)))).andExpect(status().isBadRequest());
        }
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM wardrobe_item",Integer.class));
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM bulk_import",Integer.class));
    }
    @Test void bulkDatabaseFailureRollsBackItemsAndRequestReservation() throws Exception {
        db.execute("ALTER TABLE wardrobe_item ADD CONSTRAINT test_bulk_failure CHECK (name <> 'Reject this')");
        try {
            var body=Map.of("requestId",UUID.randomUUID().toString(),"items",List.of(input("First item","Shirt"),input("Reject this","Shirt")));
            assertThrows(jakarta.servlet.ServletException.class, () -> mvc.perform(post("/api/items/bulk").contentType("application/json").content(json.writeValueAsString(body))));
            assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM wardrobe_item",Integer.class));
            assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM bulk_import",Integer.class));
        } finally {db.execute("ALTER TABLE wardrobe_item DROP CONSTRAINT test_bulk_failure");}
    }

 @Test void garmentDetailsPersistThroughEditsAndBackupRestore() throws Exception {
  var data=input("Dark blue jeans","Pants");data.put("details",Map.of("fit","Slim","garmentType","Jeans","shade","Dark blue","hex","#344565"));
  String id=json.readTree(mvc.perform(post("/api/items").contentType("application/json").content(json.writeValueAsString(data))).andExpect(status().isCreated()).andExpect(jsonPath("$.details.fit").value("Slim")).andReturn().getResponse().getContentAsString()).get("id").asText();
  mvc.perform(put("/api/items/"+id).contentType("application/json").content(json.writeValueAsString(data))).andExpect(status().isOk()).andExpect(jsonPath("$.details.shade").value("Dark blue"));
  String backup=mvc.perform(get("/api/backup")).andReturn().getResponse().getContentAsString();db.update("DELETE FROM wardrobe_item");
  mvc.perform(post("/api/restore").contentType("application/json").content(backup)).andExpect(status().isOk());
  mvc.perform(get("/api/items")).andExpect(jsonPath("$[0].details.fit").value("Slim")).andExpect(jsonPath("$[0].details.hex").value("#344565"));
 }

 @Test void automaticStyleOutfitsCanBeRecordedAndManualChoicesWin() throws Exception {
  var shirt=input("Auto shirt","Shirt");shirt.put("details",Map.of("styleMode","auto"));
  var pants=input("Auto pants","Pants");pants.put("details",Map.of("styleMode","auto"));
  String a=json.readTree(mvc.perform(post("/api/items").contentType("application/json").content(json.writeValueAsString(shirt))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText();
  String b=json.readTree(mvc.perform(post("/api/items").contentType("application/json").content(json.writeValueAsString(pants))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText();
  var look=new LinkedHashMap<>(wear(List.of(a,b),"Office",0));look.put("dressStyle","Formal");
  mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(look))).andExpect(status().isCreated());
  shirt.put("details",Map.of("styleMode","manual"));shirt.put("styles",List.of("Casual"));
  mvc.perform(put("/api/items/"+a).contentType("application/json").content(json.writeValueAsString(shirt))).andExpect(status().isOk());
  mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(look))).andExpect(status().isBadRequest());
 }
}
