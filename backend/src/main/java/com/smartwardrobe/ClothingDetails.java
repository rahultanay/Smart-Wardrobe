package com.smartwardrobe;
import java.util.*;
public class ClothingDetails {
 static final com.fasterxml.jackson.databind.ObjectMapper JSON=new com.fasterxml.jackson.databind.ObjectMapper();
 static String encode(Map<String,String> details) {try{return JSON.writeValueAsString(details==null?Map.of():details);}catch(Exception e){throw new IllegalArgumentException("Invalid garment details");}}
 static Map<String,String> read(String value,String photo,String color) {
  Map<String,String> result=new LinkedHashMap<>();
  try {if(value!=null) result.putAll(JSON.readValue(value,new com.fasterxml.jackson.core.type.TypeReference<Map<String,String>>(){}));}catch(Exception ignored){}
  if(!result.containsKey("shade"))result.putAll(analyze(photo,color));
  result.putIfAbsent("fit","Unknown");result.putIfAbsent("garmentType","Unknown");return result;
 }
 static Map<String,String> analyze(String photo,String color) {
  try {
   var image=javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(Base64.getDecoder().decode(photo.substring(photo.indexOf(',')+1))));
   Map<Integer,long[]> bins=new HashMap<>();
   for(int y=image.getHeight()/4;y<image.getHeight()*3/4;y+=3)for(int x=image.getWidth()/4;x<image.getWidth()*3/4;x+=3){int rgb=image.getRGB(x,y),r=(rgb>>16)&255,g=(rgb>>8)&255,b=rgb&255;int key=(r/32)*64+(g/32)*8+b/32;var bin=bins.computeIfAbsent(key,k->new long[4]);bin[0]++;bin[1]+=r;bin[2]+=g;bin[3]+=b;}
   var bin=bins.values().stream().max(Comparator.comparingLong(v->v[0])).orElse(new long[]{1,180,180,180});
   int r=(int)(bin[1]/bin[0]),g=(int)(bin[2]/bin[0]),b=(int)(bin[3]/bin[0]);double light=.2126*r+.7152*g+.0722*b;
   String shade=light<65?"Dark":light>175?"Light":"Medium";
   shade=switch(color){case "Black"->light<32?"Jet black":light<65?"Soft black":"Washed black";case "White"->Math.max(r,Math.max(g,b))-Math.min(r,Math.min(g,b))>16?"Ivory / cream":light>225?"Bright white":"Off-white";case "Blue","Navy"->light<65?"Deep navy":light<110?"Dark blue":light<165?"Mid blue":"Light blue";default->shade+" "+color.toLowerCase();};
   return Map.of("shade",shade,"hex",String.format("#%02x%02x%02x",r,g,b));
  }catch(Exception e){return Map.of("shade",color);}
 }
}
