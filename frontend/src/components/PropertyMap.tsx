"use client";

import { Home, MapPin, Building2, Store } from "lucide-react";

interface Property {
    id: string;
    name: string;
    location: string;
    description?: string;
    type?: string;
}

export function PropertyMap({ properties, onEstateClick }: { properties: Property[], onEstateClick?: (property: Property) => void }) {
    // A stylized grid representing the properties in an "estate layout"
    // Since we don't have real coordinates, we'll arrange them in a visually pleasing grid

    const getIcon = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'commercial': return <Building2 className="h-6 w-6" />;
            case 'retail': return <Store className="h-6 w-6" />;
            default: return <Home className="h-6 w-6" />;
        }
    };

    return (
        <div className="relative w-full h-full min-h-[400px] bg-[var(--cool-silver)]/30 rounded-3xl overflow-hidden border-2 border-dashed border-[var(--cool-silver-dark)] flex items-center justify-center p-8">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--wine-red)_1px,_transparent_1px)] bg-[length:24px_24px]"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 relative z-10 w-full">
                {properties.map((property, idx) => (
                    <div
                        key={property.id}
                        onClick={() => onEstateClick?.(property)}
                        className="group bg-white p-6 shadow-xl border border-[var(--cool-silver-dark)] rounded-2xl flex flex-col items-center justify-center text-center space-y-3 hover:scale-105 transition-all cursor-pointer hover:border-[var(--wine-red)] animate-in zoom-in duration-300"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className={`p-4 rounded-xl bg-[var(--wine-red)]/5 text-[var(--wine-red)] group-hover:bg-[var(--wine-red)] group-hover:text-white transition-colors`}>
                            {getIcon(property.type)}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-tight truncate max-w-[120px]">{property.name}</h3>
                            <div className="flex items-center justify-center text-[8px] font-black text-gray-400 gap-1 uppercase tracking-widest">
                                <MapPin className="h-2 w-2" />
                                {(property.location || "Global HQ").split(',')[0]}
                            </div>
                        </div>

                        <div className="pt-2">
                            <span className="px-2 py-0.5 bg-[var(--cool-silver)] rounded-lg text-[6px] font-black text-gray-500 uppercase tracking-tighter">
                                ID: {property.id.slice(0, 8)}
                            </span>
                        </div>
                    </div>
                ))}

                {properties.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center space-y-4 py-20">
                        <MapPin className="h-12 w-12 text-gray-300" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Awaiting property data ingestion...</p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-6 left-6 flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-[var(--cool-silver-dark)] shadow-sm">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global Sync Active</span>
            </div>
        </div>
    );
}
