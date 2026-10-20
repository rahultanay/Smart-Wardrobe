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
        db.update("DELETE FROM wear_item"); db.update("DELETE FROM wear_event"); db.update("DELETE FROM laundry_event"); db.update("DELETE FROM wardrobe_item");
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
        mvc.perform(post("/api/history").contentType("application/json").content(json.writeValueAsString(wear(ids.subList(0,2),"College",0)))).andExpect(status().isBadRequest());
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
}
