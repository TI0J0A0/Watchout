export const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export const CATALOG = [
  { id:1, title:"Dandadan", score:8.9, eps:12, type:"anime", studio:"Science SARU", year:"2024",
    genres:["Ação","Sobrenatural","Romance"], airing:true, airDay:"Sat", duration:24,
    color:"#FF6B35", colorB:"#FF9A5C",
    img:"https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&h=700&fit=crop&q=85",
    synopsis:"Momo Ayase e Ken Takakura têm crenças opostas — ela acredita em aliens, ele em fantasmas. Depois de uma aposta insana, ambos são arrastados para um mundo onde o paranormal e a ficção científica se fundem.",
    streaming:["Crunchyroll"], members:820000,
    userStatus:null, userScore:null, userEp:0 },
  { id:2, title:"Solo Leveling S2", score:8.7, eps:13, type:"anime", studio:"A-1 Pictures", year:"2025",
    genres:["Ação","Fantasia"], airing:true, airDay:"Sun", duration:24,
    color:"#5856D6", colorB:"#AF52DE",
    img:"https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600&h=700&fit=crop&q=85",
    synopsis:"Sung Jin-Woo continua sua ascensão como o único Hunter que pode subir de nível, enfrentando ameaças colossais enquanto os segredos de sua origem emergem.",
    streaming:["Crunchyroll"], members:1200000,
    userStatus:"watching", userScore:null, userEp:5 },
  { id:3, title:"Re:Zero S4", score:9.0, eps:null, type:"anime", studio:"White Fox", year:"2025",
    genres:["Fantasia","Suspense"], airing:true, airDay:"Wed", duration:24,
    color:"#34AADC", colorB:"#5AC8FA",
    img:"https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&h=700&fit=crop&q=85",
    synopsis:"Subaru Natsuki retorna a um mundo que ele jurou proteger. A quarta temporada mergulha em novos reinos do sofrimento e da esperança.",
    streaming:["Crunchyroll"], members:950000,
    userStatus:"plan_to_watch", userScore:null, userEp:0 },
  { id:4, title:"Frieren", score:9.3, eps:28, type:"anime", studio:"Madhouse", year:"2023",
    genres:["Fantasia","Aventura"], airing:false, duration:24,
    color:"#30B0C7", colorB:"#64D2FF",
    img:"https://images.unsplash.com/photo-1542362567-b07e54358753?w=600&h=700&fit=crop&q=85",
    synopsis:"A elfa maga Frieren sobreviveu à grande aventura, mas perdeu a noção do tempo humano. Em uma nova jornada ela parte para entender o que significa a vida mortal.",
    streaming:["Crunchyroll"], members:2100000,
    userStatus:"completed", userScore:10, userEp:28 },
  { id:5, title:"The Last of Us S2", score:9.1, eps:7, type:"series", studio:"HBO", year:"2025",
    genres:["Drama","Terror"], airing:true, airDay:"Sun", duration:52,
    color:"#636366", colorB:"#98989D",
    img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=700&fit=crop&q=85",
    synopsis:"Cinco anos depois, Joel e Ellie vivem uma paz frágil em Jackson. Mas o passado cobra seu preço quando novos conflitos ameaçam tudo que construíram.",
    streaming:["Max"], members:780000,
    userStatus:null, userScore:null, userEp:0 },
  { id:6, title:"Shōgun", score:9.0, eps:10, type:"series", studio:"FX / Hulu", year:"2024",
    genres:["Drama Histórico","Guerra"], airing:false, duration:65,
    color:"#BF5AF2", colorB:"#DA8FFF",
    img:"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=700&fit=crop&q=85",
    synopsis:"No Japão feudal de 1600, o navegador inglês John Blackthorne se vê no centro de uma guerra pelo poder entre os mais poderosos senhores feudais.",
    streaming:["Disney+"], members:430000,
    userStatus:"dropped", userScore:7, userEp:4 },
  { id:7, title:"Dune: Part Two", score:8.5, eps:null, type:"film", studio:"Warner Bros.", year:"2024",
    genres:["Ficção Científica","Épico"], airing:false, duration:166,
    color:"#FF9F0A", colorB:"#FFD60A",
    img:"https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600&h=700&fit=crop&q=85",
    synopsis:"Paul Atreides une forças com os Fremen enquanto busca vingança contra os conspiradores que destruíram sua família — e pode impedir um futuro terrível.",
    streaming:["Max","Prime Video"], members:610000,
    userStatus:"completed", userScore:9, userEp:null },
  { id:8, title:"Dorohedoro S2", score:8.6, eps:null, type:"anime", studio:"MAPPA", year:"2025",
    genres:["Dark Fantasy","Comédia"], airing:true, airDay:"Fri", duration:24,
    color:"#32ADE6", colorB:"#5AC8FA",
    img:"https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=700&fit=crop&q=85",
    synopsis:"Caiman ainda busca quem roubou seu rosto. A segunda temporada aprofunda o caos grotesco do Buraco com novas revelações sobre sua identidade.",
    streaming:["Netflix"], members:310000,
    userStatus:null, userScore:null, userEp:0 },
];

export const TOP = [
  { rank:1, title:"Fullmetal Alchemist: Brotherhood", score:9.11, eps:64, year:"2009", img:"https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=140&h=200&fit=crop" },
  { rank:2, title:"Steins;Gate", score:9.07, eps:24, year:"2011", img:"https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=140&h=200&fit=crop" },
  { rank:3, title:"Frieren: Beyond Journey's End", score:9.03, eps:28, year:"2023", img:"https://images.unsplash.com/photo-1542362567-b07e54358753?w=140&h=200&fit=crop" },
  { rank:4, title:"Hunter x Hunter (2011)", score:9.03, eps:148, year:"2011", img:"https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=140&h=200&fit=crop" },
  { rank:5, title:"Gintama°", score:8.96, eps:51, year:"2015", img:"https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=140&h=200&fit=crop" },
  { rank:6, title:"Attack on Titan Final", score:8.95, eps:16, year:"2022", img:"https://images.unsplash.com/photo-1513151233558-d860c5398176?w=140&h=200&fit=crop" },
];

export const SC = {
  Crunchyroll:   "#F47521",
  Netflix:       "#E50914",
  Max:           "#002BE7",
  "Disney+":     "#0063E5",
  "Prime Video": "#00A8E0",
  Funimation:    "#410099",
  HIDIVE:        "#00BAFF",
  Stremio:       "#8A2BE2",
};

export const STREAMING_URLS = {
  Crunchyroll:   t => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  Netflix:       t => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  Max:           t => `https://www.max.com/search?q=${encodeURIComponent(t)}`,
  "Disney+":     t => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
  "Prime Video": t => `https://www.amazon.com.br/s?k=${encodeURIComponent(t)}`,
  Funimation:    t => `https://www.funimation.com/search/?q=${encodeURIComponent(t)}`,
  HIDIVE:        t => `https://www.hidive.com/search?q=${encodeURIComponent(t)}`,
  Stremio:       t => `https://web.strem.io/#/search?search=${encodeURIComponent(t)}`,
};

export const SM = {
  "watching":      { color:"#30B350", dot:"#34C759" },
  "plan_to_watch": { color:"#0A84FF", dot:"#0A84FF" },
  "completed":     { color:"#BF5AF2", dot:"#BF5AF2" },
  "dropped":       { color:"#FF3B30", dot:"#FF3B30" },
};

export const AVATAR_GRADS = [
  ['#0A84FF','#BF5AF2'],
  ['#FF6B35','#FF2D55'],
  ['#34C759','#30B0C7'],
  ['#FF9F0A','#FF6B35'],
  ['#5856D6','#BF5AF2'],
  ['#FF2D55','#AF52DE'],
];

export const BANNER_THEMES = [
  { a:'#0A84FF', b:'#BF5AF2' },
  { a:'#FF6B35', b:'#FF9A5C' },
  { a:'#34C759', b:'#30B0C7' },
  { a:'#FF3B30', b:'#FF9F0A' },
  { a:'#5856D6', b:'#AF52DE' },
  { a:'#FF2D55', b:'#FF6B6B' },
  { a:'#1C1C1E', b:'#48484A' },
  { a:'#30B0C7', b:'#34AADC' },
];


