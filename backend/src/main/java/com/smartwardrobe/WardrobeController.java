package com.smartwardrobe;

import java.util.Map;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class WardrobeController {
    private final WardrobeStore store;
    public WardrobeController(WardrobeStore store) { this.store=store; }
    public record Flag(Boolean value) {}
    @GetMapping("/health") public Map<String,String> health() { return Map.of("status","ok"); }
    @GetMapping("/items") public List<WardrobeStore.Item> items() { return store.items(); }
    @PostMapping("/items") @ResponseStatus(HttpStatus.CREATED)
    public WardrobeStore.Item create(@RequestBody WardrobeStore.ItemInput item) { return store.create(item); }
    @PostMapping("/items/bulk") @ResponseStatus(HttpStatus.CREATED)
    public List<WardrobeStore.Item> bulk(@RequestBody WardrobeStore.BulkInput input) { return store.createBulk(input); }
    @PutMapping("/items/{id}") public WardrobeStore.Item update(@PathVariable String id,@RequestBody WardrobeStore.ItemInput item) { return store.update(id,item); }
    @PatchMapping("/items/{id}/classification") public WardrobeStore.Item classify(@PathVariable String id,@RequestBody WardrobeStore.Classification input) { return store.classify(id,input); }
    @PatchMapping("/items/{id}/appearance") public WardrobeStore.Item appearance(@PathVariable String id,@RequestBody WardrobeStore.Appearance input) { return store.appearance(id,input); }
    private boolean value(Flag flag) { if(flag==null || flag.value()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"A true or false value is required"); return flag.value(); }
    @PatchMapping("/items/{id}/laundry") public WardrobeStore.Item laundry(@PathVariable String id,@RequestBody Flag flag) { return store.laundry(id,value(flag)); }
    @PatchMapping("/items/{id}/archive") public WardrobeStore.Item archive(@PathVariable String id,@RequestBody Flag flag) { return store.archive(id,value(flag)); }
    @GetMapping("/history") public List<WardrobeStore.Wear> history() { return store.history(); }
    @PostMapping("/history") @ResponseStatus(HttpStatus.CREATED)
    public WardrobeStore.Wear wear(@RequestBody WardrobeStore.WearInput input) { return store.wear(input); }
    @GetMapping("/backup") public WardrobeStore.Snapshot backup() { return store.snapshot(); }
    @PostMapping("/restore") public Map<String,Integer> restore(@RequestBody WardrobeStore.Snapshot data) { return store.restore(data); }
}
