/**
 * Motor del lector de códigos de barras (sin React): cámara, lectura y
 * diagnóstico. Lo usan Cierre Caja y el editor de la tienda. En Cierre
 * Caja: es copia de tienda-martin/src/lib/barcode-scanner.ts (cambiar los dos).
 *
 * Lector nativo del navegador si existe (Chrome en Android); si no (iPhone),
 * el de respaldo (ZXing). Su motor (zxing_reader.wasm, ~1 MB) se sirve desde la
 * propia app (public/) y se descarga recién al abrir el escáner. Si se
 * actualiza barcode-detector, copiar de nuevo node_modules/zxing-wasm/dist/reader/zxing_reader.wasm.
 */

/** Sube con cada cambio del lector: el diagnóstico la muestra para saber qué versión tiene el celular. */
export const SCANNER_VERSION = "4";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
/** Recuadro guía, en fracciones del visor. */
export const GUIDE = { left: 0.12, right: 0.88, top: 0.08, bottom: 0.92 };
/** Lado mayor de cada cuadro analizado. Con menos, la primera mitad del número sale mal. */
const MAX_SIDE = 1600;
/** El mismo número tiene que salir dos veces en esta ventana para aceptarlo. */
const CONFIRM_WINDOW_MS = 2500;

type Detector = { detect: (source: HTMLCanvasElement) => Promise<{ rawValue: string }[]> };

export type ScanDiagnostics = {
  version: string;
  reader: string;
  engine: string;
  camera: string;
  zoom: string;
  frames: number;
  msPerFrame: number;
  reads: string[];
  lastError: string | null;
};

/** "Votos": acepta un número cuando sale dos veces dentro de la ventana. Puro, para poder probarlo. */
export function createConfirmer(windowMs = CONFIRM_WINDOW_MS) {
  const seen = new Map<string, number[]>();
  return (code: string, now: number): boolean => {
    const times = (seen.get(code) ?? []).filter((t) => now - t < windowMs);
    times.push(now);
    seen.set(code, times);
    return times.length >= 2;
  };
}

/** Código de barras válido (EAN-13 / EAN-8 / UPC): el último dígito es de control. */
export function isValidBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export const cleanBarcode = (value: string) => value.replace(/\D/g, "");

async function createDetector(): Promise<{ detector: Detector; reader: string }> {
  const native = (globalThis as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats(): Promise<string[]> } })
    .BarcodeDetector;
  if (native) {
    try {
      const supported = await native.getSupportedFormats();
      if (supported.includes("ean_13")) return { detector: new native({ formats: FORMATS }), reader: "nativo del navegador" };
    } catch {
      // sigue con el de respaldo
    }
  }
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? "/zxing_reader.wasm" : prefix + path),
    },
    fireImmediately: true,
  });
  return { detector: new BarcodeDetector({ formats: FORMATS as never }), reader: "respaldo (ZXing)" };
}

const describe = (e: unknown) =>
  e instanceof Error ? `${e.name}: ${e.message}` : typeof e === "string" ? e : JSON.stringify(e);

type Handlers = {
  onCode: (code: string) => void;
  onReady: () => void;
  onError: (message: string) => void;
};

/**
 * Abre la cámara en `video` y empieza a leer. Devuelve `stop` y una función
 * que da el diagnóstico actual.
 */
export function startScanner(video: HTMLVideoElement, { onCode, onReady, onError }: Handlers) {
  const diag: ScanDiagnostics = {
    version: SCANNER_VERSION,
    reader: "cargando…",
    engine: "—",
    camera: "—",
    zoom: "—",
    frames: 0,
    msPerFrame: 0,
    reads: [],
    lastError: null,
  };
  let stream: MediaStream | null = null;
  let timer = 0;
  let stopped = false;
  let done = false;
  const confirm = createConfirmer();

  const fail = (message: string, e?: unknown) => {
    diag.lastError = e ? describe(e) : message;
    if (!stopped) onError(message);
  };

  (async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      fail("Este navegador no deja usar la cámara. Tipeá el número de la etiqueta.");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
    } catch (e) {
      const denied = e instanceof DOMException && e.name === "NotAllowedError";
      fail(
        denied
          ? "No hay permiso para usar la cámara. Activalo en el navegador o tipeá el número de la etiqueta."
          : "No se pudo abrir la cámara. Tipeá el número de la etiqueta.",
        e,
      );
      return;
    }
    if (stopped) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    // Zoom 2× si la cámara lo permite: así se aleja el celular hasta donde enfoca
    // (los iPhone Pro no enfocan de cerca con la cámara principal) y el código
    // igual se ve grande.
    const track = stream.getVideoTracks()[0];
    try {
      const caps = (track.getCapabilities?.() ?? {}) as { zoom?: { min: number; max: number }; focusMode?: string[] };
      const advanced: Record<string, unknown>[] = [];
      if (caps.zoom && caps.zoom.max >= 1.5) advanced.push({ zoom: Math.min(2, caps.zoom.max) });
      if (caps.focusMode?.includes("continuous")) advanced.push({ focusMode: "continuous" });
      if (advanced.length) await track.applyConstraints({ advanced } as MediaTrackConstraints);
      const zoom = (track.getSettings() as { zoom?: number }).zoom;
      diag.zoom = caps.zoom ? `${zoom ?? "?"}× (máx ${caps.zoom.max}×)` : "no disponible";
    } catch (e) {
      diag.zoom = `error: ${describe(e)}`;
    }

    try {
      video.srcObject = stream;
      await video.play();
    } catch (e) {
      fail("No se pudo mostrar la cámara. Tipeá el número de la etiqueta.", e);
      return;
    }
    diag.camera = `${video.videoWidth}×${video.videoHeight}${track.label ? ` · ${track.label}` : ""}`;

    let detector: Detector;
    try {
      diag.engine = "cargando…";
      const created = await createDetector();
      detector = created.detector;
      diag.reader = created.reader;
      diag.engine = "listo";
    } catch (e) {
      diag.engine = "error";
      fail("No se pudo cargar el lector. Revisá la conexión o tipeá el número de la etiqueta.", e);
      return;
    }
    if (stopped) return;
    onReady();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let frame = 0;
    let totalMs = 0;
    const tick = async () => {
      if (stopped || done || !ctx) return;
      const v = video;
      try {
        if (v.readyState >= 2 && v.videoWidth) {
          diag.camera = `${v.videoWidth}×${v.videoHeight}${track.label ? ` · ${track.label}` : ""}`;
          // Qué parte del video se ve en el visor (object-cover recorta los bordes).
          const box = v.getBoundingClientRect();
          const scale = Math.max(box.width / v.videoWidth, box.height / v.videoHeight);
          const visW = box.width / scale;
          const visH = box.height / scale;
          const visX = (v.videoWidth - visW) / 2;
          const visY = (v.videoHeight - visH) / 2;
          // Un cuadro el recuadro guía (ampliado), el siguiente todo lo visible.
          const region =
            frame++ % 2 === 0
              ? {
                  x: visX + visW * GUIDE.left,
                  y: visY + visH * GUIDE.top,
                  w: visW * (GUIDE.right - GUIDE.left),
                  h: visH * (GUIDE.bottom - GUIDE.top),
                }
              : { x: visX, y: visY, w: visW, h: visH };
          const k = Math.min(2, MAX_SIDE / Math.max(region.w, region.h));
          canvas.width = Math.round(region.w * k);
          canvas.height = Math.round(region.h * k);
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(v, region.x, region.y, region.w, region.h, 0, 0, canvas.width, canvas.height);
          const t0 = performance.now();
          const found = await detector.detect(canvas);
          totalMs += performance.now() - t0;
          diag.frames++;
          diag.msPerFrame = Math.round(totalMs / diag.frames);
          for (const f of found) {
            const code = cleanBarcode(f.rawValue);
            const ok = isValidBarcode(code);
            diag.reads = [`${f.rawValue}${ok ? "" : " (inválido)"}`, ...diag.reads].slice(0, 6);
            if (ok && confirm(code, performance.now())) {
              done = true;
              navigator.vibrate?.(60);
              onCode(code);
              return;
            }
          }
        }
      } catch (e) {
        // Antes se ignoraba en silencio: ahora queda en el diagnóstico.
        diag.lastError = describe(e);
      }
      timer = window.setTimeout(tick, 60);
    };
    tick();
  })();

  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    },
    diagnostics: () => ({ ...diag, reads: [...diag.reads] }),
  };
}

/** Un cuadro de la cámara, en la resolución completa, como JPEG (para mandar y probar). */
export async function captureFrame(video: HTMLVideoElement): Promise<Blob | null> {
  if (!video.videoWidth) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")?.drawImage(video, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}

/** Comparte la imagen (en el celular abre el menú de compartir) o la descarga. */
export async function shareOrDownload(blob: Blob, name: string) {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return;
    } catch {
      // cancelado: se descarga
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
