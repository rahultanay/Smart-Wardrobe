import {useEffect,useMemo,useState} from "react";
import "./App.css";

const clothes=[
{id:1,name:"White Shirt",type:"Shirt",icon:"👕",bg:""},
{id:2,name:"Blue Shirt",type:"Shirt",icon:"👕",bg:"blue"},
{id:3,name:"Blue Jeans",type:"Pants",icon:"👖",bg:"dark"},
{id:4,name:"White Sneakers",type:"Shoes",icon:"👟",bg:"shoes-bg"}
];
const outfits=[
{id:1,name:"Your College Look",description:"White shirt · Blue pants · White sneakers",clothes:["White Shirt","Blue Jeans","White Sneakers"],occasion:"College"},
{id:2,name:"Blue Casual",description:"Blue shirt · Blue pants · White sneakers",clothes:["Blue Shirt","Blue Jeans","White Sneakers"],occasion:"College"},
{id:3,name:"Simple Evening",description:"Blue shirt · Blue pants · White sneakers",clothes:["Blue Shirt","Blue Jeans","White Sneakers"],occasion:"Date"}
];
const occasions=[
{name:"College",icon:"🎓",description:"Everyday campus outfits",count:18},
{name:"Office",icon:"💼",description:"Professional & smart",count:8},
{name:"Date",icon:"❤️",description:"Casual & stylish",count:6},
{name:"Party",icon:"🎉",description:"Stand out tonight",count:5}
];

function load(key){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[];}catch{return [];}}

function App(){
 const [current,setCurrent]=useState(0);
 const [occasion,setOccasion]=useState("College");
 const [laundry,setLaundry]=useState(()=>load("laundryItems"));
 const [history,setHistory]=useState(()=>load("outfitHistory"));
 const outfit=outfits[current];
 const available=clothes.length-laundry.length;
 const now=new Date();
 const thisMonth=history.filter(h=>{const d=new Date(h.timestamp);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
 const repeat=useMemo(()=>history.find(h=>h.occasion===occasion&&JSON.stringify(h.clothes)===JSON.stringify(outfit.clothes)),[history,occasion,outfit]);
 useEffect(()=>localStorage.setItem("laundryItems",JSON.stringify(laundry)),[laundry]);
 useEffect(()=>localStorage.setItem("outfitHistory",JSON.stringify(history)),[history]);
 const icon=item=>item.includes("Jeans")?"👖":item.includes("Sneakers")?"👟":"👕";
 function usable(o){return !o.clothes.some(x=>laundry.includes(x));}
 function tryAnother(){for(let i=1;i<=outfits.length;i++){const n=(current+i)%outfits.length;if(usable(outfits[n])){setCurrent(n);setOccasion(outfits[n].occasion);return;}}alert("No complete outfit is available with the current laundry items.");}
 function chooseOccasion(o){setOccasion(o);const i=outfits.findIndex(x=>x.occasion===o);if(i>=0&&usable(outfits[i]))setCurrent(i);}
 function toggleLaundry(name){setLaundry(x=>x.includes(name)?x.filter(i=>i!==name):[...x,name]);}
 function wear(){const d=new Date();setHistory(x=>[{id:Date.now(),date:d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),timestamp:d.getTime(),outfit:outfit.name,clothes:outfit.clothes,occasion},...x]);alert("Outfit added to your history!");}
 return <div className="app-shell">
 <aside className="sidebar"><div className="logo"><span>👕</span><h2>Wardrobe</h2></div><nav><a href="#dashboard" className="active">🏠 Dashboard</a><a href="#wardrobe">👕 My Wardrobe</a><a href="#outfits">✨ Outfit Ideas</a><a href="#laundry">🧺 Laundry</a><a href="#history">📅 Outfit History</a><a href="#occasions">📍 My Occasions</a></nav><div className="sidebar-bottom"><a href="#dashboard">⚙️ Settings</a><a href="#dashboard">🚪 Logout</a></div></aside>
 <main className="main" id="dashboard">
 <header className="topbar"><div><p className="small-text">SMART WARDROBE</p><h1>Good morning 👋</h1></div><div className="profile"><div className="profile-pic">R</div><div><strong>Rahul</strong><p>Fashion Explorer</p></div></div></header>
 <section className="today-outfit" id="outfits"><div className="today-content"><p className="small-text">TODAY'S OUTFIT</p><h2>{outfit.name}</h2><p>{outfit.description}</p><div className="outfit-actions"><button onClick={wear} disabled={!usable(outfit)} title={usable(outfit)?"":"An item in this outfit is in the laundry"}>✓ Wear This</button><button className="secondary" onClick={tryAnother}>↻ Try Another</button></div></div><div className="today-clothes">{outfit.clothes.map(x=><div className="big-cloth" key={x}>{icon(x)}</div>)}</div></section>
 {repeat&&<section className="warning-card"><div className="warning-icon">⚠️</div><div><p className="small-text">OUTFIT HISTORY ALERT</p><h3>You've worn this combination recently.</h3><p>This outfit was already worn for {repeat.occasion}.</p></div><button className="view-history" onClick={()=>document.getElementById("history")?.scrollIntoView()}>View History →</button></section>}
 <section className="stats"><div className="stat-card"><div className="stat-icon">👕</div><div><h3>{available}</h3><p>Available Clothes</p></div></div><div className="stat-card"><div className="stat-icon">🧺</div><div><h3>{laundry.length}</h3><p>In Laundry</p></div></div><div className="stat-card"><div className="stat-icon">📅</div><div><h3>{thisMonth}</h3><p>Outfits This Month</p></div></div><div className="stat-card"><div className="stat-icon">✨</div><div><h3>15</h3><p>Outfit Ideas</p></div></div></section>
 <section className="section" id="occasions"><div className="section-heading"><div><p className="small-text">WHERE ARE YOU GOING?</p><h2>My Occasions</h2></div><a href="#occasions">Manage →</a></div><div className="occasion-grid">{occasions.map(o=><div key={o.name} className={`occasion-card ${occasion===o.name?"selected-occasion":""}`} onClick={()=>chooseOccasion(o.name)}><div className="occasion-icon">{o.icon}</div><h3>{o.name}</h3><p>{o.description}</p><span>{o.count} outfits</span></div>)}</div></section>
 <section className="section" id="wardrobe"><div className="section-heading"><div><p className="small-text">YOUR CLOSET</p><h2>My Wardrobe</h2></div><a href="#wardrobe">View All →</a></div><div className="clothes-grid">{clothes.map(c=>{const inL=laundry.includes(c.name);return <div className={`clothing-card ${inL?"in-laundry":""}`} key={c.id}><div className={`clothing-image ${c.bg}`}>{c.icon}</div><div className="clothing-info"><h3>{c.name}</h3><p>{c.type} · Casual</p><button className="laundry-button" onClick={()=>toggleLaundry(c.name)}>{inL?"✓ In Laundry":"🧺 Mark as Laundry"}</button></div></div>})}</div></section>
 <section className="section laundry-section" id="laundry"><div className="section-heading"><div><p className="small-text">CURRENTLY UNAVAILABLE</p><h2>🧺 Laundry</h2></div></div><div className="laundry-list">{laundry.length===0?<p className="empty-laundry">No clothes are currently in laundry.</p>:laundry.map(x=><div className="laundry-item" key={x}><div className="laundry-item-info"><div className="laundry-item-icon">{icon(x)}</div><strong>{x}</strong></div><button className="return-button" onClick={()=>toggleLaundry(x)}>↩ Back to Wardrobe</button></div>)}</div></section>
 <section className="section" id="history"><div className="section-heading"><div><p className="small-text">YOUR RECENT LOOKS</p><h2>Outfit History</h2></div></div><div className="history-table"><div className="history-row heading"><span>Date</span><span>Outfit</span><span>Occasion</span><span>Status</span></div>{history.length===0?<p className="empty-history">No outfits worn yet.</p>:history.map(h=><div className="history-row" key={h.id}><span>{h.date}</span><span>{h.outfit}</span><span>{h.occasion}</span><span className="recent">Worn</span></div>)}</div></section>
 </main></div>;
}
export default App;
