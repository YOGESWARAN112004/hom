
"use client";

import { motion } from "framer-motion";
import { generateImageSrcSet } from "@/lib/imageUtils";

// Re-using some placeholder images or you could fetch products
const LOOKBOOK_IMAGES = [
    { src: "/assets/generated_images/ralph_lauren_style_luxury_polo_fashion.png", alt: "Classic Luxury", title: "The Polo Collection" },
    { src: "/assets/generated_images/gucci_style_high_fashion_floral_dress.png", alt: "Floral Elegance", title: "Renaissance Bloom" },
    { src: "/assets/generated_images/mclaren_luxury_automotive_accessories.png", alt: "High Performance", title: "Speed & Style" },
    { src: "/assets/generated_images/coach_style_leather_handbag_craftsmanship.png", alt: "Leather Craft", title: "Modern Heritage" },
    // Add duplicates for grid effect if needed, or placeholders
];

export default function LookbookPage() {
    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <section className="relative h-[40vh] bg-black flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-black/50 z-10" />
                <img
                    src={LOOKBOOK_IMAGES[1].src}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    alt="Lookbook Header"
                />
                <div className="relative z-20 text-center text-white p-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-heading text-4xl md:text-6xl mb-4"
                    >
                        THE LOOKBOOK
                    </motion.h1>
                    <p className="text-sm md:text-lg text-white/80 max-w-xl mx-auto font-light">
                        A curation of style, heritage, and modern luxury.
                    </p>
                </div>
            </section>

            {/* Gallery Grid */}
            <section className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {LOOKBOOK_IMAGES.map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className="group relative h-[400px] md:h-[600px] overflow-hidden bg-secondary"
                        >
                            <img
                                src={item.src}
                                srcSet={generateImageSrcSet(item.src, { widths: [600, 1200], maxWidth: 1200 }) || undefined}
                                alt={item.alt}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-0 left-0 w-full p-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                                <h3 className="font-heading text-2xl text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-white/80 uppercase tracking-widest">{item.alt}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
}
