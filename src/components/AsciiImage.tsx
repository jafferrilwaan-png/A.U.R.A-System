"use client";

import React, { useEffect, useRef, type CSSProperties } from "react";

const DEFAULT_IMAGE =
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/e4476503-c1e3-4358-3ff6-539deda1f800/w=800";

type ColorMode = "mono" | "image";
type Fit = "cover" | "contain";

interface RevealOptions {
    size: number;
    softness: number;
}

const DEFAULTS = {
    fit: "cover" as Fit,
    focusY: 20,
    columns: 60,
    ramp: " .:-=+*#%@",
    invert: false,
    contrast: 100,
    colorMode: "image" as ColorMode,
    inkColor: "#FFFFFF",
    reveal: true,
    autoReveal: true,
    revealOptions: { size: 65, softness: 12 } as RevealOptions,
};

const contrastAt = (value: number) => 0.5 + (value / 100) * 2;

function placeRect(
    imgW: number,
    imgH: number,
    boxW: number,
    boxH: number,
    fit: Fit,
    focusY: number
) {
    const scale =
        fit === "contain"
            ? Math.min(boxW / imgW, boxH / imgH)
            : Math.max(boxW / imgW, boxH / imgH);
    const dw = imgW * scale;
    const dh = imgH * scale;
    const f = fit === "cover" ? Math.min(1, Math.max(0, focusY / 100)) : 0.5;
    return { dx: (boxW - dw) / 2, dy: (boxH - dh) * f, dw, dh };
}

export interface AsciiImageProps {
    image?: { src: string; srcSet?: string; alt?: string } | string;
    fit?: Fit;
    focusY?: number;
    columns?: number;
    ramp?: string;
    invert?: boolean;
    contrast?: number;
    colorMode?: ColorMode;
    inkColor?: string;
    reveal?: boolean;
    autoReveal?: boolean;
    revealOptions?: RevealOptions;
    style?: CSSProperties;
    className?: string;
}

function resolveImageSrc(image: unknown): string | undefined {
    if (!image) return undefined;
    if (typeof image === "string") return image.trim() || undefined;
    return (image as { src?: string }).src || undefined;
}

export default function AsciiImage(props: AsciiImageProps) {
    const {
        image,
        fit = DEFAULTS.fit,
        focusY = DEFAULTS.focusY,
        columns = DEFAULTS.columns,
        ramp = DEFAULTS.ramp,
        invert = DEFAULTS.invert,
        contrast = DEFAULTS.contrast,
        colorMode = DEFAULTS.colorMode,
        inkColor = DEFAULTS.inkColor,
        reveal = DEFAULTS.reveal,
        autoReveal = true,
        revealOptions = DEFAULTS.revealOptions,
        style,
        className = "",
    } = props;

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const offRef = useRef<HTMLCanvasElement | null>(null);
    const photoRef = useRef<HTMLCanvasElement | null>(null);
    const maskRef = useRef<HTMLCanvasElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const isVisibleRef = useRef(false);
    const pointer = useRef({ x: -9999, y: -9999, inside: false });

    const src = resolveImageSrc(image) || DEFAULT_IMAGE;
    const revealSize = revealOptions?.size ?? DEFAULTS.revealOptions.size;
    const revealSoftness = revealOptions?.softness ?? DEFAULTS.revealOptions.softness;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        let raf = 0;
        let alive = true;
        let coverRect = { dx: 0, dy: 0, dw: 0, dh: 0 };
        let blobX = 0;
        let blobY = 0;
        let seeded = false;

        const chars = ramp && ramp.length > 0 ? ramp : DEFAULTS.ramp;
        const punch = contrastAt(contrast);

        function getSize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const w = canvas.clientWidth || 300;
            const h = canvas.clientHeight || 300;
            return { w, h, dpr };
        }

        // Build cached ASCII canvas once on image load / resize
        function buildAscii() {
            const img = imgRef.current;
            if (!img || !img.complete || img.naturalWidth === 0) return;
            const { w, h, dpr } = getSize();
            canvas.width = Math.max(1, Math.round(w * dpr));
            canvas.height = Math.max(1, Math.round(h * dpr));

            const cols = Math.max(16, Math.min(80, Math.round(columns)));
            const cellW = (w * dpr) / cols;
            const fontPx = cellW * 1.6;
            const cellH = fontPx;
            const rows = Math.max(1, Math.floor((h * dpr) / cellH));

            const sampler = document.createElement("canvas");
            sampler.width = cols;
            sampler.height = rows;
            const sctx = sampler.getContext("2d", { willReadFrequently: true });
            if (!sctx) return;

            const place = placeRect(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height, fit, focusY);
            coverRect = place;

            sctx.clearRect(0, 0, cols, rows);
            sctx.drawImage(img, place.dx / cellW, place.dy / cellH, place.dw / cellW, place.dh / cellH);

            let data: Uint8ClampedArray;
            try {
                data = sctx.getImageData(0, 0, cols, rows).data;
            } catch {
                return;
            }

            let off = offRef.current;
            if (!off) {
                off = document.createElement("canvas");
                offRef.current = off;
            }
            off.width = canvas.width;
            off.height = canvas.height;
            const octx = off.getContext("2d");
            if (!octx) return;

            octx.fillStyle = "#080B10";
            octx.fillRect(0, 0, off.width, off.height);
            octx.font = `${fontPx.toFixed(1)}px ui-monospace, monospace`;
            octx.textBaseline = "top";

            const last = chars.length - 1;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const i = (r * cols + c) * 4;
                    const rr = data[i];
                    const gg = data[i + 1];
                    const bb = data[i + 2];
                    let lum = (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255;
                    lum = (lum - 0.5) * punch + 0.5;
                    if (invert) lum = 1 - lum;
                    lum = Math.max(0, Math.min(1, lum));
                    const ch = chars[Math.round(lum * last)];
                    if (ch === " ") continue;

                    octx.fillStyle =
                        colorMode === "image"
                            ? `rgb(${Math.min(255, rr + 25)}, ${Math.min(255, gg + 25)}, ${Math.min(255, bb + 25)})`
                            : inkColor;
                    octx.fillText(ch, c * cellW, r * cellH);
                }
            }

            // Prepare pre-rendered high-res photo layer
            let photo = photoRef.current;
            if (!photo) {
                photo = document.createElement("canvas");
                photoRef.current = photo;
            }
            photo.width = canvas.width;
            photo.height = canvas.height;
            const pctx = photo.getContext("2d");
            if (pctx) {
                pctx.clearRect(0, 0, photo.width, photo.height);
                pctx.drawImage(img, coverRect.dx, coverRect.dy, coverRect.dw, coverRect.dh);
            }
        }

        function paint() {
            const off = offRef.current;
            if (!off) return;

            ctx.drawImage(off, 0, 0);

            const img = imgRef.current;
            const photo = photoRef.current;
            if (!reveal || !img || !photo) return;

            const { dpr } = getSize();
            const now = performance.now() / 1000;

            let targetX = 0;
            let targetY = 0;

            if (pointer.current.inside) {
                targetX = pointer.current.x * dpr;
                targetY = pointer.current.y * dpr;
            } else if (autoReveal) {
                const cw = canvas.width;
                const ch = canvas.height;
                const cx = cw * 0.5;
                const cy = ch * 0.42;
                targetX = cx + Math.sin(now * 1.5) * (cw * 0.28);
                targetY = cy + Math.cos(now * 1.1) * (ch * 0.22);
            } else {
                return;
            }

            if (!seeded) {
                blobX = targetX;
                blobY = targetY;
                seeded = true;
            } else {
                blobX += (targetX - blobX) * 0.2;
                blobY += (targetY - blobY) * 0.2;
            }

            let mask = maskRef.current;
            if (!mask) {
                mask = document.createElement("canvas");
                maskRef.current = mask;
            }
            if (mask.width !== canvas.width || mask.height !== canvas.height) {
                mask.width = canvas.width;
                mask.height = canvas.height;
            }

            const mctx = mask.getContext("2d");
            if (!mctx) return;

            const pulse = autoReveal && !pointer.current.inside ? 1 + 0.12 * Math.sin(now * 2.5) : 1;
            const radius = revealSize * dpr * pulse;

            mctx.clearRect(0, 0, mask.width, mask.height);
            mctx.save();
            mctx.filter = `blur(${Math.round(revealSoftness * dpr)}px)`;
            mctx.fillStyle = "#FFFFFF";
            mctx.beginPath();
            mctx.arc(blobX, blobY, radius, 0, Math.PI * 2);
            mctx.fill();
            mctx.restore();

            // Composite revealed photo onto final canvas
            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            
            // Draw masked photo directly using clipping
            ctx.beginPath();
            ctx.arc(blobX, blobY, radius * 1.25, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(photo, 0, 0);
            ctx.restore();
        }

        function loop() {
            if (!alive) return;
            if (isVisibleRef.current) {
                paint();
            }
            raf = requestAnimationFrame(loop);
        }

        function onMove(event: PointerEvent) {
            const rect = canvas.getBoundingClientRect();
            pointer.current.x = event.clientX - rect.left;
            pointer.current.y = event.clientY - rect.top;
            pointer.current.inside = true;
        }

        function onLeave() {
            pointer.current.inside = false;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            if (!alive) return;
            imgRef.current = img;
            buildAscii();
            paint();
        };
        img.src = src;

        // IntersectionObserver: only paint when in viewport to ensure 60fps buttery scrolling
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    isVisibleRef.current = e.isIntersecting;
                });
            },
            { threshold: 0.05 }
        );
        observer.observe(canvas);

        raf = requestAnimationFrame(loop);

        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerleave", onLeave);

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            observer.disconnect();
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerleave", onLeave);
        };
    }, [src, fit, focusY, columns, ramp, invert, contrast, colorMode, inkColor, reveal, autoReveal, revealSize, revealSoftness]);

    return (
        <canvas
            ref={canvasRef}
            aria-label="Profile ASCII Reveal"
            className={className}
            style={{
                ...style,
                display: "block",
                width: "100%",
                height: "100%",
                cursor: "pointer",
                willChange: "transform",
            }}
        />
    );
}
