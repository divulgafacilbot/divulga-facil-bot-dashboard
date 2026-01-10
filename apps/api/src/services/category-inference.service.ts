/**
 * Category Inference Service
 *
 * Advanced category detection with context-aware matching.
 * Uses multiple strategies:
 * 1. Accessory detection - identifies products that are accessories FOR something
 * 2. Primary product detection - identifies the main product type
 * 3. Priority-based matching - more specific categories override generic ones
 * 4. Exclusion patterns - prevents false positives
 */

export type ProductCategory =
  | 'Utilidades Domésticas'
  | 'Eletrodomésticos'
  | 'Eletrônicos'
  | 'Celulares e Telefonia'
  | 'Informática'
  | 'Moda Feminina'
  | 'Moda Masculina'
  | 'Moda Infantil'
  | 'Calçados'
  | 'Beleza e Perfumaria'
  | 'Casa e Decoração'
  | 'Móveis'
  | 'Esportes e Lazer'
  | 'Brinquedos'
  | 'Games'
  | 'Livros'
  | 'Automotivo'
  | 'Ferramentas'
  | 'Pet Shop'
  | 'Bebês'
  | 'Alimentos e Bebidas'
  | 'Saúde'
  | 'Papelaria'
  | 'Instrumentos Musicais'
  | 'Jardim e Piscina'
  | 'Construção'
  | 'Acessórios'
  | 'Geral';

/**
 * Words that indicate the product is an accessory/utility FOR something else
 * When these words precede appliance/electronics keywords, the product is likely
 * an organizer/holder/accessory rather than the appliance itself.
 */
const ACCESSORY_INDICATORS = [
  // Organizers and containers
  'organizador', 'organizadora', 'porta', 'suporte', 'apoio',
  'divisor', 'divisoria', 'separador', 'gaveta',
  'caixa', 'cesto', 'cesta', 'bandeja', 'pote', 'recipiente',
  'container', 'armazenador', 'dispensador',
  // Holders and supports
  'holder', 'stand', 'base', 'rack', 'grade', 'prateleira',
  // Covers and protectors
  'capa', 'capinha', 'case', 'protetor', 'protecao', 'pelicula', 'skin',
  'forro', 'revestimento', 'cobertura',
  // Accessories
  'acessorio', 'acessorios', 'kit', 'conjunto', 'jogo',
  // Cleaning and maintenance
  'limpador', 'limpeza', 'escova', 'pano', 'esponja', 'flanela',
  'desodorizador', 'aromatizador', 'absorvedor',
  // Replacement parts
  'refil', 'filtro', 'reservatorio', 'tampa', 'vedacao', 'borracha',
  // Attachments
  'adaptador', 'extensor', 'prolongador', 'conector',
  // Mat and padding
  'tapete', 'mat', 'almofada', 'pad',
];

/**
 * Words that indicate THIS IS the main product (appliance/electronic)
 * These override accessory detection when they appear as standalone products
 */
const PRIMARY_PRODUCT_INDICATORS = [
  'novo', 'nova', 'original', 'bivolt', '110v', '220v', 'volts',
  'watts', 'potencia', 'motor', 'compressor', 'digital', 'automatico',
  'automatica', 'eletrico', 'eletrica', 'smart', 'inteligente',
];

/**
 * Context patterns that suggest accessory usage
 * Format: [before words, after words]
 * If a keyword is surrounded by these patterns, it's likely an accessory
 */
const ACCESSORY_CONTEXT_PATTERNS: Array<{ before: string[]; after: string[] }> = [
  // "de/para + appliance" patterns
  { before: ['de', 'para', 'p/', 'pra'], after: [] },
  // "appliance + specific storage" patterns
  { before: [], after: ['em', 'na', 'no', 'do', 'da'] },
];

interface CategoryConfig {
  category: ProductCategory;
  keywords: string[];
  priority: number;
  // Keywords that if present, should NOT match this category
  excludeIfContains?: string[];
}

/**
 * Category definitions with keywords and priorities.
 * Higher priority = more specific category, takes precedence.
 */
const CATEGORY_CONFIG: CategoryConfig[] = [
  // Utilidades Domésticas - HIGHEST PRIORITY
  // Catches organizers, holders, supports that might contain appliance words
  {
    category: 'Utilidades Domésticas',
    priority: 15,
    keywords: [
      // Organizers
      'organizador', 'organizadora', 'porta-talheres', 'porta-temperos',
      'porta-condimentos', 'porta-escova', 'porta-sabonete', 'porta-papel',
      'porta-prato', 'porta-copo', 'porta-garrafa', 'porta-lata',
      'porta-ovos', 'porta-frutas', 'porta-legumes', 'porta-mantimentos',
      'porta-treco', 'porta-objetos', 'porta-revista', 'porta-controle',
      'escorredor', 'secador de louça', 'secador de prato',
      // Storage containers
      'pote hermetico', 'pote de vidro', 'pote plastico', 'tupperware',
      'marmita', 'lunch box', 'bentô', 'quentinha',
      'jarra', 'garrafa termica', 'squeeze', 'copo termico',
      // Kitchen utilities
      'tabua de corte', 'tabua de carne', 'ralador', 'descascador',
      'abridor', 'saca-rolha', 'pegador', 'pinça culinaria',
      'medidor', 'dosador', 'funil', 'peneira', 'coador',
      'forma de gelo', 'forma de silicone', 'descanso de panela',
      'luva termica', 'pegador de panela', 'avental',
      // Cleaning utilities
      'lixeira', 'cesto de lixo', 'saco de lixo', 'dispenser',
      'porta-detergente', 'porta-esponja', 'suporte esponja',
      'rodo', 'vassoura', 'pa de lixo', 'balde', 'esfregao',
      // Bathroom utilities
      'saboneteira', 'porta-escova de dente', 'porta-algodao',
      'porta-cotonete', 'organizador de banheiro', 'bandeja de banheiro',
      // Laundry utilities
      'cesto de roupa', 'varal', 'pregador', 'cabide', 'organizador de armario',
      'saco a vacuo', 'organizador de gaveta', 'divisor de gaveta',
    ]
  },

  // Acessórios genéricos - HIGH PRIORITY
  // Catches caps, cases, protectors for electronics
  {
    category: 'Acessórios',
    priority: 14,
    keywords: [
      'capa', 'capinha', 'case', 'skin', 'pelicula', 'protetor de tela',
      'carregador', 'cabo', 'fonte', 'adaptador', 'suporte celular',
      'suporte tablet', 'suporte notebook', 'holder',
      'power bank', 'bateria externa', 'bateria portatil',
      'fone de ouvido', 'fone bluetooth', 'earbuds', 'airpods',
      'headphone', 'headset', 'microfone',
    ],
    excludeIfContains: ['geladeira', 'freezer', 'fogao', 'forno'],
  },

  // Pet Shop - HIGH PRIORITY
  {
    category: 'Pet Shop',
    priority: 12,
    keywords: [
      'racao', 'petisco', 'sache', 'comedouro', 'bebedouro pet',
      'casinha pet', 'casinha cachorro', 'casinha gato', 'cama pet',
      'almofada pet', 'caminha cachorro', 'caminha gato',
      'coleira', 'guia pet', 'peitoral pet', 'focinheira',
      'brinquedo pet', 'bolinha pet', 'mordedor', 'arranhador',
      'shampoo pet', 'shampoo cachorro', 'shampoo gato',
      'aquario', 'filtro aquario', 'bomba aquario',
      'gaiola', 'viveiro', 'poleiro',
      'caixa de transporte pet', 'bolsa transporte pet',
      'tapete higienico', 'fralda pet', 'areia gato',
      'cachorro', 'gato', 'pet', 'cao', 'canino', 'felino',
    ]
  },

  // Bebês - HIGH PRIORITY
  {
    category: 'Bebês',
    priority: 12,
    keywords: [
      'fralda', 'fralda descartavel', 'fralda de pano',
      'pomada assadura', 'lenco umedecido',
      'mamadeira', 'chupeta', 'bico', 'esterilizador',
      'carrinho de bebe', 'bebe conforto', 'cadeirinha bebe',
      'berco', 'moises', 'ninho bebe', 'kit berco',
      'baba eletronica', 'monitor bebe',
      'andador bebe', 'cercadinho', 'tapete atividades',
      'mordedor bebe', 'chocalho', 'mobile bebe',
      'shampoo bebe', 'sabonete bebe', 'colonia bebe',
      'bebe', 'infantil', 'nenem', 'recem nascido',
    ]
  },

  // Games - HIGH PRIORITY
  {
    category: 'Games',
    priority: 11,
    keywords: [
      'playstation', 'ps4', 'ps5', 'xbox', 'nintendo', 'switch',
      'console', 'video game', 'videogame',
      'controle gamer', 'joystick', 'gamepad', 'volante gamer',
      'headset gamer', 'cadeira gamer', 'mesa gamer',
      'jogo ps', 'jogo xbox', 'jogo nintendo', 'game pass',
      'vr', 'realidade virtual', 'oculus', 'psvr',
    ]
  },

  // Celulares e Telefonia
  {
    category: 'Celulares e Telefonia',
    priority: 11,
    keywords: [
      'celular', 'smartphone', 'iphone', 'samsung galaxy', 'motorola',
      'xiaomi', 'redmi', 'poco', 'realme', 'oneplus', 'oppo',
      'telefone fixo', 'telefone sem fio', 'interfone',
    ],
    excludeIfContains: ['capa', 'capinha', 'case', 'pelicula', 'suporte', 'carregador'],
  },

  // Eletrodomésticos
  {
    category: 'Eletrodomésticos',
    priority: 10,
    keywords: [
      // Cozinha - main appliances
      'forno eletrico', 'forno embutir', 'fogao', 'cooktop',
      'micro-ondas', 'microondas', 'geladeira', 'refrigerador',
      'freezer', 'frigobar', 'lava-loucas', 'lavadora de louca',
      'liquidificador', 'batedeira', 'processador de alimentos',
      'mixer', 'espremedor', 'cafeteira', 'torradeira', 'sanduicheira',
      'grill', 'air fryer', 'airfryer', 'fritadeira',
      'panela eletrica', 'panela de arroz', 'panela pressao eletrica',
      'chaleira eletrica', 'purificador de agua', 'bebedouro', 'adega',
      // Lavanderia
      'lavadora', 'lava e seca', 'secadora', 'maquina de lavar',
      'tanquinho', 'centrifuga', 'ferro de passar', 'vaporizador',
      // Limpeza
      'aspirador', 'robo aspirador', 'vassoura eletrica', 'enceradeira',
      // Climatização
      'ar condicionado', 'ar-condicionado', 'ventilador', 'circulador',
      'climatizador', 'aquecedor', 'desumidificador', 'umidificador',
      'purificador de ar', 'depurador', 'exaustor', 'coifa',
      // Brands (only when alone or with product type)
      'electrolux', 'brastemp', 'consul', 'philco', 'midea', 'mueller',
    ],
    excludeIfContains: [
      'organizador', 'porta', 'suporte', 'capa', 'tampa', 'grade',
      'gaveta', 'prateleira', 'cesto', 'bandeja', 'pote', 'divisor',
      'limpador', 'escova', 'filtro refil', 'borracha', 'vedacao',
    ],
  },

  // Eletrônicos
  {
    category: 'Eletrônicos',
    priority: 10,
    keywords: [
      'tv', 'televisao', 'televisor', 'smart tv', 'led', 'oled', 'qled',
      'soundbar', 'home theater', 'caixa de som', 'speaker bluetooth',
      'camera', 'filmadora', 'gopro', 'drone', 'gimbal',
      'projetor', 'chromecast', 'fire stick', 'roku', 'apple tv',
      'echo', 'alexa', 'google home', 'smart speaker',
      'smartwatch', 'smartband', 'mi band', 'galaxy watch', 'apple watch',
      'kindle', 'e-reader', 'tablet', 'ipad',
      'radio', 'vitrola', 'toca-discos', 'receiver', 'amplificador',
    ],
    excludeIfContains: ['capa', 'case', 'suporte', 'base', 'pelicula'],
  },

  // Informática
  {
    category: 'Informática',
    priority: 10,
    keywords: [
      'notebook', 'laptop', 'ultrabook', 'macbook', 'chromebook',
      'computador', 'desktop', 'pc gamer', 'all in one', 'mini pc',
      'monitor', 'mouse', 'teclado', 'webcam', 'mousepad',
      'impressora', 'multifuncional', 'scanner',
      'hd externo', 'ssd', 'pendrive', 'memoria ram', 'placa de video',
      'processador', 'gabinete', 'fonte pc', 'cooler pc', 'placa mae',
      'roteador', 'modem', 'repetidor', 'access point', 'switch rede',
      'hub usb', 'dock station',
    ],
    excludeIfContains: ['capa', 'case', 'suporte', 'base', 'skin'],
  },

  // Moda Infantil
  {
    category: 'Moda Infantil',
    priority: 9,
    keywords: [
      'roupa infantil', 'roupa crianca', 'moda infantil', 'moda kids',
      'body bebe', 'macacao infantil', 'pijama infantil', 'fantasia infantil',
      'vestido infantil', 'conjunto infantil', 'shorts infantil',
    ]
  },

  // Instrumentos Musicais
  {
    category: 'Instrumentos Musicais',
    priority: 9,
    keywords: [
      'violao', 'guitarra', 'baixo eletrico', 'ukulele', 'cavaquinho',
      'teclado musical', 'piano', 'piano digital', 'controlador midi',
      'bateria musical', 'percussao', 'pandeiro', 'cajon', 'surdo', 'baqueta',
      'violino', 'violoncelo', 'contrabaixo',
      'flauta', 'clarinete', 'saxofone', 'trompete', 'trombone',
      'pedal guitarra', 'amplificador guitarra', 'mesa de som',
      'corda violao', 'afinador', 'palheta', 'capotraste',
    ]
  },

  // Brinquedos
  {
    category: 'Brinquedos',
    priority: 9,
    keywords: [
      'brinquedo', 'boneca', 'boneco', 'action figure', 'pelucia',
      'lego', 'blocos de montar', 'quebra-cabeca', 'puzzle',
      'carrinho brinquedo', 'pista hot wheels', 'nerf',
      'massinha', 'play doh', 'slime', 'kit arte',
      'brinquedo educativo', 'boneca barbie', 'baby alive',
      'triciclo', 'bicicleta infantil', 'patinete infantil',
      'jogo de tabuleiro', 'uno', 'banco imobiliario',
    ]
  },

  // Moda Feminina
  {
    category: 'Moda Feminina',
    priority: 8,
    keywords: [
      'vestido', 'saia', 'blusa feminina', 'camiseta feminina',
      'calca feminina', 'legging', 'short feminino', 'bermuda feminina',
      'blazer feminino', 'casaco feminino', 'jaqueta feminina', 'cardigan',
      'lingerie', 'sutia', 'calcinha', 'pijama feminino', 'camisola',
      'biquini', 'maio', 'saida de praia',
      'bolsa', 'carteira feminina', 'clutch', 'mochila feminina',
      'bijuteria', 'brinco', 'colar', 'pulseira', 'anel',
    ]
  },

  // Moda Masculina
  {
    category: 'Moda Masculina',
    priority: 8,
    keywords: [
      'camisa masculina', 'camiseta masculina', 'polo masculina',
      'calca masculina', 'jeans masculino', 'bermuda masculina',
      'blazer masculino', 'terno', 'paleto', 'colete', 'gravata',
      'casaco masculino', 'jaqueta masculina', 'moletom masculino',
      'cueca', 'meia masculina', 'pijama masculino',
      'sunga', 'bermuda de banho',
      'carteira masculina', 'cinto masculino',
    ]
  },

  // Calçados
  {
    category: 'Calçados',
    priority: 8,
    keywords: [
      'tenis', 'sapato', 'sapatenis', 'mocassim', 'oxford', 'bota', 'coturno',
      'sandalia', 'chinelo', 'rasteira', 'tamanco', 'papete',
      'salto', 'scarpin', 'peep toe', 'mule', 'anabela',
      'sapatilha', 'alpargata', 'slip on', 'slide',
      'nike', 'adidas', 'puma', 'vans', 'converse', 'new balance',
      'palmilha', 'cadarco',
    ]
  },

  // Beleza e Perfumaria
  {
    category: 'Beleza e Perfumaria',
    priority: 8,
    keywords: [
      'perfume', 'colonia', 'eau de parfum', 'desodorante',
      'maquiagem', 'batom', 'base maquiagem', 'corretivo', 'blush', 'bronzer',
      'rimel', 'mascara de cilios', 'delineador', 'sombra',
      'esmalte', 'manicure', 'acetona',
      'shampoo', 'condicionador', 'mascara capilar', 'leave-in',
      'prancha cabelo', 'chapinha', 'babyliss', 'secador de cabelo',
      'creme facial', 'hidratante', 'serum', 'protetor solar', 'skincare',
      'depilador', 'barbeador', 'aparelho de barbear',
    ]
  },

  // Esportes e Lazer
  {
    category: 'Esportes e Lazer',
    priority: 8,
    keywords: [
      'bicicleta', 'bike', 'ciclismo', 'capacete ciclismo',
      'esteira', 'eliptico', 'bicicleta ergometrica', 'spinning',
      'haltere', 'anilha', 'barra musculacao', 'kettlebell', 'colchonete',
      'bola futebol', 'bola basquete', 'bola volei', 'tenis de mesa',
      'raquete', 'luva boxe', 'saco de pancada', 'caneleira',
      'barraca camping', 'mochila trilha', 'saco de dormir',
      'vara de pesca', 'molinete', 'carretilha',
      'patins', 'skate', 'patinete',
    ]
  },

  // Livros
  {
    category: 'Livros',
    priority: 8,
    keywords: [
      'livro', 'livros', 'romance', 'biografia', 'autoajuda',
      'manga', 'hq', 'quadrinho', 'graphic novel',
      'box livro', 'colecao livro', 'trilogia', 'saga',
      'apostila', 'livro concurso', 'livro vestibular',
    ]
  },

  // Móveis
  {
    category: 'Móveis',
    priority: 8,
    keywords: [
      'sofa', 'poltrona', 'puff', 'banco estofado', 'banqueta',
      'mesa jantar', 'mesa centro', 'mesa lateral', 'escrivaninha',
      'cadeira escritorio', 'cadeira gamer',
      'cama casal', 'cama solteiro', 'beliche', 'bicama', 'cabeceira', 'colchao',
      'guarda-roupa', 'armario', 'comoda', 'sapateira', 'closet',
      'estante', 'rack tv', 'painel tv',
      'criado-mudo', 'aparador', 'buffet', 'cristaleira',
    ]
  },

  // Automotivo
  {
    category: 'Automotivo',
    priority: 8,
    keywords: [
      'pneu', 'roda carro', 'calota',
      'oleo motor', 'aditivo', 'fluido de freio',
      'bateria automotiva', 'vela de ignicao',
      'farol carro', 'lanterna carro',
      'tapete automotivo', 'capa de banco carro',
      'som automotivo', 'central multimidia', 'camera de re',
      'suporte celular carro', 'carregador veicular',
    ]
  },

  // Ferramentas
  {
    category: 'Ferramentas',
    priority: 8,
    keywords: [
      'furadeira', 'parafusadeira', 'serra eletrica', 'lixadeira', 'esmerilhadeira',
      'martelo', 'chave de fenda', 'chave philips', 'alicate', 'torques',
      'trena', 'nivel laser', 'prumo',
      'jogo de ferramentas', 'maleta ferramentas',
      'compressor ar', 'pistola de pintura',
      'escada', 'andaime', 'cavalete',
      'epi', 'luva protecao', 'oculos protecao',
    ]
  },

  // Saúde
  {
    category: 'Saúde',
    priority: 8,
    keywords: [
      'termometro', 'oximetro', 'medidor de pressao', 'balanca',
      'mascara descartavel', 'alcool gel', 'luva descartavel',
      'vitamina', 'suplemento alimentar', 'omega 3',
      'curativo', 'gaze', 'esparadrapo', 'atadura',
      'nebulizador', 'inalador', 'aspirador nasal',
      'massageador', 'bolsa termica', 'compressa',
      'cadeira de rodas', 'bengala', 'muleta',
      'cinta', 'joelheira', 'tornozeleira', 'munhequeira',
    ]
  },

  // Casa e Decoração
  {
    category: 'Casa e Decoração',
    priority: 7,
    keywords: [
      'cortina', 'persiana', 'tapete sala', 'capacho', 'passadeira',
      'almofada decorativa', 'manta', 'colcha', 'edredom', 'lencol', 'travesseiro',
      'toalha banho', 'roupao', 'porta-toalha',
      'vaso decorativo', 'quadro decorativo', 'espelho decorativo', 'moldura',
      'luminaria', 'abajur', 'lustre', 'pendente', 'spot',
      'panela', 'frigideira', 'cacarola', 'forma bolo', 'assadeira',
      'prato', 'tigela', 'copo vidro', 'xicara', 'taca', 'jogo de jantar',
      'talher', 'faca cozinha', 'garfo', 'colher', 'espatula', 'concha',
    ]
  },

  // Jardim e Piscina
  {
    category: 'Jardim e Piscina',
    priority: 8,
    keywords: [
      'piscina', 'piscina inflavel', 'bomba piscina', 'filtro piscina', 'cloro',
      'churrasqueira', 'carvao', 'espeto', 'grelha churrasco',
      'mesa jardim', 'cadeira jardim', 'ombrelone', 'guarda-sol',
      'rede descanso', 'balanco jardim', 'pergolado', 'gazebo',
      'mangueira jardim', 'aspersor', 'irrigador',
      'cortador de grama', 'aparador de grama', 'rocadeira',
      'vaso de planta', 'jardineira', 'floreira',
      'terra vegetal', 'adubo', 'fertilizante', 'semente',
    ]
  },

  // Papelaria
  {
    category: 'Papelaria',
    priority: 7,
    keywords: [
      'caderno', 'fichario', 'agenda', 'planner',
      'caneta', 'lapis', 'lapiseira', 'marca texto', 'canetinha',
      'borracha', 'apontador', 'corretivo', 'tesoura', 'cola',
      'mochila escolar', 'estojo', 'lancheira',
      'papel sulfite', 'cartolina', 'eva',
      'post it', 'bloco de notas', 'etiqueta',
      'grampeador', 'perfurador', 'clips', 'grampo',
    ]
  },

  // Alimentos e Bebidas
  {
    category: 'Alimentos e Bebidas',
    priority: 7,
    keywords: [
      'cafe', 'cha', 'achocolatado', 'leite po',
      'biscoito', 'bolacha', 'cereal', 'granola', 'aveia',
      'chocolate', 'bombom', 'trufa', 'doce',
      'refrigerante', 'suco', 'agua mineral', 'energetico',
      'cerveja', 'vinho', 'whisky', 'vodka', 'gin', 'rum', 'cachaca',
      'azeite', 'oleo cozinha', 'vinagre', 'molho', 'tempero',
      'arroz', 'feijao', 'macarrao', 'farinha', 'acucar',
      'whey protein', 'creatina', 'bcaa', 'suplemento',
    ]
  },

  // Construção
  {
    category: 'Construção',
    priority: 7,
    keywords: [
      'cimento', 'argamassa', 'rejunte', 'massa corrida', 'gesso',
      'tijolo', 'bloco concreto', 'telha', 'calha',
      'piso', 'porcelanato', 'ceramica', 'revestimento', 'azulejo',
      'tinta parede', 'verniz', 'selador', 'primer',
      'porta madeira', 'janela', 'esquadria', 'fechadura', 'macaneta',
      'fio eletrico', 'cabo eletrico', 'disjuntor', 'tomada', 'interruptor',
      'tubo pvc', 'conexao hidraulica', 'registro', 'torneira', 'sifao',
    ]
  },
];

/**
 * Normalize text for comparison
 * Removes accents, special characters, and normalizes spaces
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if the product is an accessory based on title patterns
 * Returns true if the product appears to be an accessory FOR something else
 */
function isAccessoryProduct(normalizedTitle: string): boolean {
  const words = normalizedTitle.split(' ');

  // Check if title starts with an accessory indicator
  for (const indicator of ACCESSORY_INDICATORS) {
    const normalizedIndicator = normalizeText(indicator);

    // Check if title starts with the indicator
    if (normalizedTitle.startsWith(normalizedIndicator + ' ')) {
      return true;
    }

    // Check if indicator is in first 3 words
    const firstWords = words.slice(0, 3).join(' ');
    if (firstWords.includes(normalizedIndicator)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a keyword should be excluded due to context
 * Returns true if the keyword appears in an accessory context
 */
function isInAccessoryContext(normalizedTitle: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword);
  const words = normalizedTitle.split(' ');
  const keywordIndex = words.findIndex(w => w.includes(normalizedKeyword) || normalizedKeyword.includes(w));

  if (keywordIndex === -1) return false;

  // Check words before the keyword
  if (keywordIndex > 0) {
    const wordBefore = words[keywordIndex - 1];
    for (const pattern of ACCESSORY_CONTEXT_PATTERNS) {
      if (pattern.before.includes(wordBefore)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Infer category from product title using context-aware matching.
 *
 * @param title - Product title to analyze
 * @returns The inferred category
 */
export function inferCategory(title: string): ProductCategory {
  if (!title || typeof title !== 'string') {
    return 'Geral';
  }

  const normalizedTitle = normalizeText(title);

  // First check: is this an accessory/utility product?
  // If title starts with accessory words, prioritize Utilidades Domésticas
  if (isAccessoryProduct(normalizedTitle)) {
    // Check Utilidades Domésticas first
    const utilidadesConfig = CATEGORY_CONFIG.find(c => c.category === 'Utilidades Domésticas');
    if (utilidadesConfig) {
      for (const keyword of utilidadesConfig.keywords) {
        if (normalizedTitle.includes(normalizeText(keyword))) {
          return 'Utilidades Domésticas';
        }
      }
    }

    // Check Acessórios
    const acessoriosConfig = CATEGORY_CONFIG.find(c => c.category === 'Acessórios');
    if (acessoriosConfig) {
      for (const keyword of acessoriosConfig.keywords) {
        if (normalizedTitle.includes(normalizeText(keyword))) {
          return 'Acessórios';
        }
      }
    }

    // If it's an accessory product but no specific match, default to Utilidades Domésticas
    return 'Utilidades Domésticas';
  }

  // Standard matching: find best category based on keywords
  const matches: { category: ProductCategory; priority: number; matchCount: number; score: number }[] = [];

  for (const config of CATEGORY_CONFIG) {
    let matchCount = 0;
    let score = 0;
    let excluded = false;

    // Check exclusions first
    if (config.excludeIfContains) {
      for (const excludeWord of config.excludeIfContains) {
        if (normalizedTitle.includes(normalizeText(excludeWord))) {
          excluded = true;
          break;
        }
      }
    }

    if (excluded) continue;

    // Count keyword matches
    for (const keyword of config.keywords) {
      const normalizedKeyword = normalizeText(keyword);

      if (normalizedTitle.includes(normalizedKeyword)) {
        // Check if keyword is in accessory context
        if (isInAccessoryContext(normalizedTitle, keyword)) {
          continue; // Skip this match
        }

        matchCount++;
        // Longer keywords are more specific, give them higher score
        score += normalizedKeyword.length;
      }
    }

    if (matchCount > 0) {
      matches.push({
        category: config.category,
        priority: config.priority,
        matchCount,
        score
      });
    }
  }

  // If no matches found, return 'Geral'
  if (matches.length === 0) {
    return 'Geral';
  }

  // Sort by priority (desc), then by score (desc), then by match count (desc)
  matches.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.matchCount - a.matchCount;
  });

  return matches[0].category;
}

/**
 * Category Inference Service class for static method usage
 */
export class CategoryInferenceService {
  /**
   * Infer category from product title
   */
  static infer(title: string): ProductCategory {
    return inferCategory(title);
  }

  /**
   * Get all available categories
   */
  static getCategories(): ProductCategory[] {
    const categories = new Set<ProductCategory>();
    for (const config of CATEGORY_CONFIG) {
      categories.add(config.category);
    }
    categories.add('Geral');
    return Array.from(categories).sort();
  }
}
