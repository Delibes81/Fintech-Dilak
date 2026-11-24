/**
 * Diccionario incorporado: comercios de México y cosas comunes del día a día.
 * Cada grupo apunta a un "rol" de categoría (el ícono de las categorías iniciales),
 * así funciona con las categorías que ya existen sin tocar la base de datos.
 * Las palabras se escriben como se dicen; se normalizan (minúsculas, sin acentos) al cargar.
 * Los comercios ambiguos (Amazon, Mercado Libre, Temu) quedan afuera: la app los aprende
 * de la primera corrección.
 */
export type Role =
  | "cart" | "utensils" | "car" | "home" | "zap" | "repeat" | "heart" | "sofa" | "graduation"
  | "card" | "ticket" | "plane" | "shirt" | "paw" | "gift" | "piggy" | "briefcase" | "sparkles" | "coins";

/** Respaldo por nombre si alguien cambió el ícono de una categoría. */
export const ROLE_NAME: Record<Role, RegExp> = {
  cart: /super|mercado|despensa|abarrot|mandado/,
  utensils: /comida|restaur|antojo/,
  car: /transp|auto|coche|carro|gasolin|movilidad/,
  home: /vivienda|renta|alquiler|hipoteca|depa/,
  zap: /servicio|luz|recibo/,
  repeat: /suscrip|streaming|plataforma/,
  heart: /salud|medic|farmac/,
  sofa: /hogar|casa/,
  graduation: /educa|escuela|colegi/,
  card: /deuda|tarjeta|credito|cuota|prestamo/,
  ticket: /ocio|salida|diversion|entreten/,
  plane: /viaje|vacacion/,
  shirt: /ropa|vestimenta|calzado/,
  paw: /mascota|perro|gato/,
  gift: /regalo/,
  piggy: /ahorro|inversion/,
  briefcase: /sueldo|salario|nomina|quincena/,
  sparkles: /extra|freelance|honorario/,
  coins: /otros ingresos|ingreso/,
};

export const ROLE_KIND: Record<Role, "expense" | "income"> = {
  cart: "expense", utensils: "expense", car: "expense", home: "expense", zap: "expense", repeat: "expense",
  heart: "expense", sofa: "expense", graduation: "expense", card: "expense", ticket: "expense", plane: "expense",
  shirt: "expense", paw: "expense", gift: "expense", piggy: "expense", briefcase: "income", sparkles: "income", coins: "income",
};

export const DICTIONARY: Record<Role, string[]> = {
  cart: [
    // Tiendas y súpers
    "oxxo", "7 eleven", "seven eleven", "seven", "circle k", "kiosko", "tienda", "tiendita", "abarrotes", "miscelánea",
    "soriana", "chedraui", "bodega aurrera", "aurrera", "mi bodega", "walmart", "superama", "la comer", "fresko",
    "city market", "sumesa", "heb", "h e b", "costco", "sams", "sams club", "sam s", "calimax", "casa ley", "smart",
    "alsuper", "al super", "merza", "tiendas 3b", "3b", "tienda neto", "tiendas neto", "súper", "supermercado",
    "mercado", "tianguis", "central de abasto", "recaudería", "frutería", "verdulería", "carnicería", "pollería",
    "tortillería", "panadería", "cremería", "salchichonería", "mandado", "despensa",
    // Cosas que se compran en el súper
    "leche", "huevo", "tortilla", "pan", "bolillo", "telera", "jitomate", "tomate", "cebolla", "ajo", "aguacate",
    "limón", "plátano", "manzana", "papaya", "fruta", "verdura", "chile", "frijol", "arroz", "pollo", "carne", "bistec",
    "carne molida", "res", "cerdo", "puerco", "pescado", "queso", "crema", "jamón", "salchicha", "yogurt", "yogur",
    "mantequilla", "azúcar", "aceite", "harina", "atún", "sopa", "pasta", "cereal", "avena", "galleta", "botana",
    "sabritas", "papas", "refresco", "coca", "coca cola", "jugo", "garrafón", "hielo", "nescafé", "café soluble",
    // Súper a domicilio por app
    "rappi turbo", "rappi market", "rappi súper", "cornershop", "walmart express", "súper a domicilio",
    "papel de baño", "papel higiénico", "servilletas", "pañal", "toallitas", "detergente", "jabón", "cloro",
    "suavizante", "suavitel", "fabuloso", "shampoo", "pasta de dientes", "desodorante", "rastrillo", "toallas femeninas",
  ],
  utensils: [
    "taco", "taquería", "torta", "quesadilla", "gordita", "sope", "tamal", "pozole", "birria", "barbacoa", "carnitas",
    "pastor", "suadero", "menudo", "elote", "esquites", "tlayuda", "enchiladas", "chilaquiles", "flautas", "tostadas",
    "mariscos", "ceviche", "aguachile", "hamburguesa", "pizza", "sushi", "ramen", "alitas", "boneless", "hot dog",
    "hotdog", "helado", "nieve", "paleta", "raspado", "churros", "crepas", "hotcakes", "café", "cafetería", "capuchino",
    "latte", "frappé", "starbucks", "cielito querido", "punta del cielo", "vips", "sanborns", "toks", "casa de toño",
    "el portón", "wings army", "little caesars", "dominos", "domino s", "pizza hut", "papa johns", "mcdonalds",
    "mcdonald s", "mc donalds", "burger king", "kfc", "carls jr", "carl s jr", "subway", "wingstop", "chilis",
    "applebees", "italiannis", "sushi itto", "krispy kreme", "dunkin", "cena",
    "comida", "desayuno", "almuerzo", "brunch", "antojitos", "antojo", "restaurante", "restaurant", "fonda",
    "cocina económica", "comida corrida", "buffet", "cerveza", "chela", "michelada", "bar", "cantina", "mezcal",
    "tequila", "pulque", "pulquería", "botanero", "propina",
    // Apps de comida a domicilio (con las formas en que el dictado suele escribirlas)
    "uber eats", "ubereats", "uber eat", "uber its", "uber it s", "uber ets", "rappi", "rapi", "didi food",
    "didifood", "didi comida", "pedido de comida", "comida a domicilio", "a domicilio", "delivery", "sin delantal",
  ],
  car: [
    "pemex", "oxxo gas", "bp", "shell", "mobil", "g500", "arco", "hidrosina", "gulf", "chevron", "repsol",
    "gasolinera", "gasolina", "magna", "diésel", "combustible", "uber", "didi", "cabify", "indriver", "indrive",
    "uber moto", "didi moto", "uber flash", "didi express", "uber comfort", "uber planet", "bolt", "lime", "taxi", "metro",
    "metrobús", "mexibús", "macrobús", "camión", "pesero", "combi", "micro", "trolebús", "tren ligero", "suburbano",
    "ecobici", "caseta", "peaje", "tag", "iave", "televía", "estacionamiento", "parquímetro", "verificación",
    "tenencia", "refrendo", "placas", "licencia de manejo", "multa", "infracción", "llanta", "vulcanizadora",
    "afinación", "mecánico", "taller mecánico", "servicio del coche", "servicio del carro", "autolavado",
    "lavado de auto", "lavado del carro", "refacciones", "autozone", "coche", "carro", "moto",
  ],
  home: [
    "renta", "alquiler", "hipoteca", "infonavit", "fovissste", "predial", "cuota de mantenimiento", "condominio",
  ],
  zap: [
    "cfe", "luz", "recibo de luz", "telmex", "izzi", "totalplay", "megacable", "telcel", "att", "at t", "movistar",
    "bait", "unefon", "virgin mobile", "sky", "dish", "gas", "gas natural", "naturgy", "gas lp", "tanque de gas",
    "cilindro de gas", "pipa", "pipa de agua", "agua", "recibo del agua", "sacmex", "siapa", "internet", "wifi",
    "recarga", "plan celular", "celular", "teléfono", "seguro", "gnp", "axa", "qualitas", "metlife", "mapfre",
  ],
  repeat: [
    "netflix", "spotify", "disney", "disney plus", "star plus", "hbo", "hbo max", "max", "prime video",
    "amazon prime", "apple music", "apple tv", "apple one", "icloud", "youtube premium", "youtube music", "google one",
    "chatgpt", "openai", "claude", "paramount", "vix", "crunchyroll", "deezer", "game pass", "xbox game pass",
    "playstation plus", "ps plus", "nintendo online", "smart fit", "smartfit", "sport city", "sports world",
    "gimnasio", "gym", "audible", "kindle unlimited", "canva", "microsoft 365", "office 365", "dropbox", "duolingo",
    "uber one", "rappi prime", "rappi pro", "amazon music", "tidal", "blim", "mubi", "twitch", "patreon",
    "linkedin premium", "tinder", "bumble",
    "suscripción", "membresía",
  ],
  heart: [
    "farmacia", "farmacias similares", "similares", "dr simi", "simi", "farmacias del ahorro", "farmacia del ahorro",
    "farmacias guadalajara", "farmacia guadalajara", "benavides", "farmacia san pablo", "yza", "médico", "doctor",
    "doctora", "consulta", "dentista", "ortodoncista", "oculista", "optometrista", "lentes", "óptica", "devlyn",
    "laboratorio", "análisis", "estudios de laboratorio", "chopo", "salud digna", "hospital", "clínica", "urgencias",
    "pediatra", "ginecólogo", "psicólogo", "terapia", "nutriólogo", "medicina", "medicamento", "receta",
    "paracetamol", "ibuprofeno", "antibiótico", "vitaminas", "vacuna", "gastos médicos", "seguro de gastos médicos",
    "inyección", "curitas",
  ],
  sofa: [
    "home depot", "sodimac", "comex", "truper", "ferretería", "tlapalería", "ikea", "coppel", "elektra", "famsa",
    "the home store", "waldos", "mumuso", "miniso", "steren", "best buy", "mueble", "colchón", "electrodoméstico",
    "refrigerador", "lavadora", "licuadora", "microondas", "foco", "escoba", "trapeador", "cubeta", "pintura",
    "plomero", "electricista", "cerrajero", "jardinero", "jardinería", "limpieza", "señora de la limpieza",
    "lavandería", "tintorería",
  ],
  graduation: [
    "colegiatura", "inscripción", "reinscripción", "escuela", "colegio", "kínder", "guardería", "primaria",
    "secundaria", "prepa", "universidad", "maestría", "curso", "clases", "libro", "útiles", "útiles escolares",
    "uniforme", "office depot", "office max", "gandhi", "el sótano", "platzi", "coursera", "udemy", "inglés",
  ],
  card: [
    "tarjeta", "tarjeta de crédito", "pago de tarjeta", "amex", "american express", "bbva", "banamex", "santander",
    "banorte", "hsbc", "nubank", "tarjeta nu", "stori", "rappicard", "kueski", "didi card", "klar", "plata card", "ualá", "vexi", "tarjeta hey", "abono", "abono coppel",
    "abono elektra", "msi", "meses sin intereses", "préstamo", "crédito", "deuda",
  ],
  ticket: [
    "cine", "cinépolis", "cinemex", "boletos", "entradas", "ticketmaster", "concierto", "teatro", "museo", "antro",
    "fiesta", "peda", "boliche", "karaoke", "feria", "six flags", "kidzania", "xcaret", "steam", "playstation", "xbox",
    "nintendo", "videojuego", "juego", "partido", "estadio", "salida", "paseo", "palomitas", "caliente",
  ],
  plane: [
    "viaje", "vuelo", "boleto de avión", "avión", "aeroméxico", "volaris", "viva aerobus", "vivaaerobus", "hotel",
    "airbnb", "booking", "expedia", "hospedaje", "vacaciones", "ado", "etn", "primera plus", "autobús", "excursión",
    "tour", "maleta", "blablacar", "despegar", "best day", "price travel", "kayak", "trivago",
  ],
  shirt: [
    "ropa", "zapatos", "tenis", "playera", "pantalón", "jeans", "vestido", "camisa", "chamarra", "sudadera",
    "calcetines", "calzones", "brasier", "falda", "liverpool", "palacio de hierro", "suburbia", "sears", "zara",
    "h m", "pull and bear", "pull bear", "bershka", "stradivarius", "shein", "cuidado con el perro", "price shoes",
    "andrea", "flexi", "nike", "adidas", "puma", "innovasport", "martí", "levis", "aeropostale",
  ],
  paw: [
    "veterinario", "veterinaria", "vet", "croqueta", "arena para gato", "arenero", "perro", "perrito", "gato",
    "gatito", "mascota", "petco", "kota", "maskota", "pet shop", "estética canina", "baño del perro",
    "vacuna del perro", "desparasitante", "pedigree", "whiskas", "dog chow", "cat chow", "purina",
  ],
  gift: ["regalo", "cumpleaños", "cumple", "aniversario", "flores", "boda", "baby shower", "intercambio"],
  piggy: ["ahorro", "inversión", "cetes", "cetesdirecto", "gbm", "afore", "guardadito"],
  briefcase: ["sueldo", "salario", "quincena", "nómina", "aguinaldo", "raya", "ptu", "reparto de utilidades", "prima vacacional"],
  sparkles: ["freelance", "cliente", "honorarios", "factura", "proyecto", "bono", "comisión", "chamba", "chambita"],
  coins: ["venta", "vendí", "reembolso", "reintegro", "devolución", "intereses", "rendimientos", "cashback", "premio"],
};
