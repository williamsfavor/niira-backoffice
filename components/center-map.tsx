"use client";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
export function CenterMap({ latitude, longitude, name }: { latitude: number; longitude: number; name: string }) { return <div className="center-map" aria-label={`Map showing ${name}`}><MapContainer center={[latitude, longitude]} zoom={14} scrollWheelZoom={false}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/><Marker position={[latitude, longitude]}/></MapContainer></div>; }
