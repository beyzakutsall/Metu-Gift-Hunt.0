// harita.js için TypeScript tanımları (React/TS uygulaması import ettiğinde kullanılır)

export interface EnlemBoylam {
  enlem: number;
  boylam: number;
}

export interface GpsKonumu extends EnlemBoylam {
  /** metre; yerdeki mavi halkanın yarıçapı */
  dogruluk?: number;
}

export interface HaritaHediyesi extends EnlemBoylam {
  id: string | number;
  /** true: kutu zıplar, ışığı parlar */
  alinabilir?: boolean;
}

export interface HaritaSecenekleri {
  /** data/ ve modeller/ klasörlerinin adresi, ör. '/3d-harita/'. Verilmezse harita.js'in bir üst klasörü. */
  veriAdresi?: string;
  /** Kameranın ilk baktığı yer */
  baslangic?: EnlemBoylam;
  /** Kurulurken ve hata olunca ortada yazı (varsayılan true) */
  yuklemeEkrani?: boolean;
  /** Sağ altta OSM ve model atfı (varsayılan true; lisans gereği kapatırsanız başka yerde gösterin) */
  atif?: boolean;
  /** İlk GPS konumunda kamera oyuncuya uçsun (varsayılan true) */
  ilkKonumdaOdaklan?: boolean;
  /** Sahne kurulunca, 'hazir'dan önce çağrılır (bkz. api.js). */
  eklenti?: (baglam: any) => Promise<{ guncelle?(saniye: number): void; yokEt?(): void } | void>;
}

export interface HaritaOlaylari {
  hazir: () => void;
  hata: (veri: { mesaj: string }) => void;
  'hediye-tiklandi': (veri: { id: string | number }) => void;
}

export interface Harita {
  /** Kurulum bitince çözülür; hata olursa Türkçe mesajlı Error ile reddedilir. yokEt'ten sonra çözülmez. */
  readonly hazir: Promise<Harita>;
  /** Olay dinler; dönen fonksiyon dinlemeyi bırakır. */
  on<O extends keyof HaritaOlaylari>(olay: O, cb: HaritaOlaylari[O]): () => void;
  /** Oyuncunun konumu; null oyuncu işaretini gizler. */
  gpsKonumu(konum: GpsKonumu | null): void;
  /** Haritadaki hediye kutularını bu listeyle değiştirir. */
  hediyeleriGoster(liste: HaritaHediyesi[]): void;
  /** Noktanın kapsayıcı içindeki ekran yeri (CSS px); görünmüyorsa null. */
  ekranKonumu(nokta: EnlemBoylam, yukseklikMetre?: number): { x: number; y: number } | null;
  oyuncuyaOdaklan(): void;
  /** true: kamera oyuncuyu izler, kaydırma kapanır. */
  takipEt(acik: boolean): void;
  /** Çizimi durdurur, belleği ve WebGL bağlamını bırakır. Sayfadan çıkarken mutlaka çağrılmalı. */
  yokEt(): void;
}

export function haritaBaslat(kapsayici: HTMLElement, secenekler?: HaritaSecenekleri): Harita;
