import "dotenv/config";
import bcrypt from "bcryptjs";
import type { EventCategory } from "@prisma/client";
import { prisma } from "../lib/prisma";

const categories = [
  { name: "Show", value: "SHOW" as const, icon: "Music", color: "#6366f1", description: "Shows de música ao vivo" },
  { name: "Festival", value: "FESTIVAL" as const, icon: "PartyPopper", color: "#f97316", description: "Festivais de música, arte e gastronomia" },
  { name: "Teatro", value: "TEATRO" as const, icon: "Theater", color: "#ec4899", description: "Peças, comédias e espetáculos" },
  { name: "Exposição", value: "EXPOSICAO" as const, icon: "ImageIcon", color: "#10b981", description: "Exposições de arte, fotografia e história" },
  { name: "Cinema", value: "CINEMA" as const, icon: "Film", color: "#0ea5e9", description: "Filmes e mostras de cinema" },
];

const events: {
  title: string;
  description: string;
  category: EventCategory;
  imageUrl: string;
  locationName: string;
  locationAddress: string;
  dateStart: Date;
  dateEnd: Date;
  price: number | null;
  isFree: boolean;
  organizer: string;
  tags: string[];
  featured: boolean;
}[] = [
  { title: "Rock na Concha - Banda Aurora", description: "Uma noite de rock autoral com a banda Aurora, com participação especial de convidados locais.", category: "SHOW", imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3", locationName: "Concha Acústica", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-07-11T20:00:00"), dateEnd: new Date("2026-07-11T23:30:00"), price: 60, isFree: false, organizer: "Aurora Produções", tags: ["rock", "banda autoral", "ao vivo"], featured: true },
  { title: "Sertanejo Universitário - Duo Terra Boa", description: "O melhor do sertanejo universitário com Duo Terra Boa, direto de Goiânia.", category: "SHOW", imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7", locationName: "Espaço Cultural Renato Russo", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-07-18T21:00:00"), dateEnd: new Date("2026-07-19T01:00:00"), price: 90, isFree: false, organizer: "Terra Boa Produções", tags: ["sertanejo", "universitário"], featured: false },
  { title: "Noite de MPB - Trio Cerrado", description: "Clássicos da MPB revisitados por um trio de músicos brasilienses.", category: "SHOW", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f", locationName: "CCBB Brasília", locationAddress: "SCES Trecho 2, Brasília - DF", dateStart: new Date("2026-08-02T19:30:00"), dateEnd: new Date("2026-08-02T22:00:00"), price: null, isFree: true, organizer: "CCBB Brasília", tags: ["mpb", "gratuito"], featured: true },
  { title: "Brasília Eletrônica Festival", description: "Line-up com DJs nacionais e internacionais em uma noite de música eletrônica.", category: "SHOW", imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745", locationName: "Estádio Mané Garrincha", locationAddress: "SRPN, Brasília - DF", dateStart: new Date("2026-09-05T22:00:00"), dateEnd: new Date("2026-09-06T05:00:00"), price: 180, isFree: false, organizer: "BSB Eletrônica", tags: ["eletrônica", "dj", "festa"], featured: true },
  { title: "Festival Gastronômico do Cerrado", description: "Chefs locais apresentam pratos autorais com ingredientes típicos do cerrado.", category: "FESTIVAL", imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1", locationName: "Parque da Cidade Sarah Kubitschek", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-07-25T11:00:00"), dateEnd: new Date("2026-07-27T22:00:00"), price: 30, isFree: false, organizer: "Sabores do Cerrado", tags: ["gastronomia", "food truck", "família"], featured: true },
  { title: "Festival de Música Independente de Brasília", description: "Três dias de música autoral com bandas emergentes do DF e entorno.", category: "FESTIVAL", imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea", locationName: "Parque da Cidade Sarah Kubitschek", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-08-14T16:00:00"), dateEnd: new Date("2026-08-16T23:00:00"), price: 40, isFree: false, organizer: "Coletivo Cerrado Sound", tags: ["música independente", "festival"], featured: false },
  { title: "Festival de Arte Urbana do DF", description: "Grafiteiros e artistas plásticos ocupam o espaço público com intervenções ao vivo.", category: "FESTIVAL", imageUrl: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8", locationName: "Complexo Cultural da República", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-09-19T10:00:00"), dateEnd: new Date("2026-09-20T18:00:00"), price: null, isFree: true, organizer: "Secretaria de Cultura do DF", tags: ["arte urbana", "grafite", "gratuito"], featured: false },
  { title: "Comédia Stand-up: Rir é o Melhor Remédio", description: "Uma noite de stand-up comedy com humoristas locais e nacionais.", category: "TEATRO", imageUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260", locationName: "Teatro Nacional Cláudio Santoro", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-07-12T20:00:00"), dateEnd: new Date("2026-07-12T22:00:00"), price: 70, isFree: false, organizer: "Rir Produções", tags: ["comédia", "stand-up"], featured: false },
  { title: "Drama: A Última Carta", description: "Peça dramática premiada sobre memória e perda, com direção de Marina Alves.", category: "TEATRO", imageUrl: "https://images.unsplash.com/photo-1503095396549-807759245b35", locationName: "Teatro Nacional Cláudio Santoro", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-08-08T19:00:00"), dateEnd: new Date("2026-08-08T21:00:00"), price: 120, isFree: false, organizer: "Cia Teatral Alves", tags: ["drama", "premiada"], featured: true },
  { title: "Teatro Infantil: O Mundo Encantado", description: "Espetáculo infantil interativo com música e fantoches para toda a família.", category: "TEATRO", imageUrl: "https://images.unsplash.com/photo-1503095396549-807759245b36", locationName: "Cine Brasília", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-10-12T16:00:00"), dateEnd: new Date("2026-10-12T17:30:00"), price: 25, isFree: false, organizer: "Trupe Encantada", tags: ["infantil", "família"], featured: false },
  { title: "Exposição: Brasília em Traços", description: "Mostra de desenhos e projetos arquitetônicos originais da construção de Brasília.", category: "EXPOSICAO", imageUrl: "https://images.unsplash.com/photo-1554907984-15263bfd63bd", locationName: "Museu Nacional Honestino Guimarães", locationAddress: "Eixo Monumental, Brasília - DF", dateStart: new Date("2026-07-01T09:00:00"), dateEnd: new Date("2026-09-30T18:00:00"), price: null, isFree: true, organizer: "Museu Nacional", tags: ["arquitetura", "história", "gratuito"], featured: true },
  { title: "Fotografia: Olhares do Cerrado", description: "Exposição fotográfica sobre a fauna, flora e povos do cerrado brasileiro.", category: "EXPOSICAO", imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba", locationName: "CCBB Brasília", locationAddress: "SCES Trecho 2, Brasília - DF", dateStart: new Date("2026-08-20T09:00:00"), dateEnd: new Date("2026-11-20T18:00:00"), price: 20, isFree: false, organizer: "Coletivo Olhar Cerrado", tags: ["fotografia", "natureza"], featured: false },
  { title: "Arte Contemporânea do DF", description: "Curadoria de obras de artistas contemporâneos do Distrito Federal.", category: "EXPOSICAO", imageUrl: "https://images.unsplash.com/photo-1531913764164-f85c52e6e654", locationName: "Conjunto Nacional", locationAddress: "SDS, Brasília - DF", dateStart: new Date("2026-11-05T10:00:00"), dateEnd: new Date("2026-12-20T20:00:00"), price: null, isFree: true, organizer: "Galeria DF Arte", tags: ["arte contemporânea", "gratuito"], featured: false },
  { title: "Mostra de Cinema Nacional", description: "Seleção de longas e curtas-metragens de diretores brasileiros contemporâneos.", category: "CINEMA", imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba", locationName: "Cine Brasília", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-09-10T18:00:00"), dateEnd: new Date("2026-09-15T22:00:00"), price: 15, isFree: false, organizer: "Cine Brasília", tags: ["cinema nacional", "mostra"], featured: false },
  { title: "Cine ao Ar Livre: Clássicos Brasileiros", description: "Sessão gratuita ao ar livre com clássicos do cinema brasileiro, pipoca inclusa.", category: "CINEMA", imageUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26", locationName: "Parque da Cidade Sarah Kubitschek", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-10-24T19:00:00"), dateEnd: new Date("2026-10-24T22:00:00"), price: null, isFree: true, organizer: "Secretaria de Cultura do DF", tags: ["cinema", "ao ar livre", "gratuito"], featured: true },
  { title: "Festival de Inverno de Brasília", description: "Programação especial com shows, oficinas e gastronomia para celebrar o inverno no cerrado.", category: "FESTIVAL", imageUrl: "https://images.unsplash.com/photo-1522158637959-30385a09e0da", locationName: "Parque da Cidade Sarah Kubitschek", locationAddress: "Asa Sul, Brasília - DF", dateStart: new Date("2026-07-04T14:00:00"), dateEnd: new Date("2026-07-06T22:00:00"), price: 50, isFree: false, organizer: "Governo do DF", tags: ["inverno", "festival", "família"], featured: true },
];

async function main() {
  console.log("Seeding categories...");
  for (const category of categories) {
    await prisma.category.upsert({
      where: { value: category.value },
      update: category,
      create: category,
    });
  }

  console.log("Seeding events...");
  // Unlike categories/users/favorites (upserted, existing rows preserved), events are
  // wiped and recreated on every run. Favorite rows cascade-delete along with their
  // event (onDelete: Cascade in schema.prisma), so re-seeding also clears favorites.
  await prisma.event.deleteMany();
  for (const event of events) {
    await prisma.event.create({
      data: { ...event, tags: JSON.stringify(event.tags) },
    });
  }

  console.log("Seeding users...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("usuario123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bsbcult.com" },
    update: {},
    create: {
      name: "Admin BsbCult",
      email: "admin@bsbcult.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "usuario@bsbcult.com" },
    update: {},
    create: {
      name: "Usuário Teste",
      email: "usuario@bsbcult.com",
      passwordHash: userPassword,
      role: "USER",
    },
  });

  console.log("Seeding sample favorites...");
  const firstEvents = await prisma.event.findMany({ take: 3 });
  for (const event of firstEvents) {
    await prisma.favorite.upsert({
      where: { userId_eventId: { userId: user.id, eventId: event.id } },
      update: {},
      create: { userId: user.id, eventId: event.id },
    });
  }

  console.log(`Done. Admin: ${admin.email} / Usuário: ${user.email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
