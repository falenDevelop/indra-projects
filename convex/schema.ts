import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(),
    status: v.string(),
  }),
  providers: defineTable({
    nombre: v.string(),
    xp: v.string(),
    correoEmpresa: v.string(),
    correoContractor: v.optional(v.string()),
    estado: v.string(),
    fechaInicio: v.string(),
    fechaFin: v.string(),
    tipo: v.string(),
    perfil: v.string(),
  }),
  projects: defineTable({
    nombre: v.string(),
    fechaInicio: v.string(),
    fechaFin: v.string(),
  }),
  teams: defineTable({
    nombre: v.string(),
    bloque: v.string(),
    projectId: v.optional(v.id('projects')),
  }),
  team_members: defineTable({
    teamId: v.id('teams'),
    providerId: v.id('providers'),
    nombre: v.string(),
    estado: v.string(),
    moduleId: v.optional(v.id('modules')),
    isFocal: v.boolean(),
  })
    .index('by_team', ['teamId'])
    .index('by_module', ['moduleId']),
  blocks: defineTable({
    nombre: v.string(),
    projectId: v.optional(v.id('projects')),
  }),
  block_modules: defineTable({
    blockId: v.id('blocks'),
    moduleId: v.id('modules'),
  }).index('by_block', ['blockId']),
  modules: defineTable({
    nombre: v.string(),
    descripcion: v.string(),
    estado: v.string(),
    repositorio: v.optional(v.string()),
    figma: v.optional(v.string()),
    pruebasAndroid: v.optional(v.number()),
    pruebasIOS: v.optional(v.number()),
    pruebasHuawei: v.optional(v.number()),
    pruebasAndroidEjecutadas: v.optional(v.number()),
    pruebasIOSEjecutadas: v.optional(v.number()),
    pruebasHuaweiEjecutadas: v.optional(v.number()),
  }),
  development_types: defineTable({
    nombre: v.string(),
    numeroDias: v.optional(v.number()),
    porcentaje: v.optional(v.number()),
  }),
  module_tasks: defineTable({
    moduleId: v.id('modules'),
    nombreActividad: v.string(),
    developmentTypeId: v.id('development_types'),
    fechaInicio: v.optional(v.string()),
    fechaFinal: v.optional(v.string()),
    porcentaje: v.number(),
  }).index('by_module', ['moduleId']),
  task_activities: defineTable({
    taskId: v.id('module_tasks'),
    porcentajeAnterior: v.number(),
    porcentajeNuevo: v.number(),
    descripcion: v.string(),
    createdAt: v.number(),
    registradoPor: v.optional(v.string()), // Nombre del usuario que registró
    registradoPorXp: v.optional(v.string()), // XP del usuario que registró
  }),
  defects: defineTable({
    moduleId: v.id('modules'),
    ticket: v.string(),
    data: v.optional(v.string()),
    comentario: v.optional(v.string()),
    estado: v.string(),
    usuario: v.optional(v.string()),
    contrasena: v.optional(v.string()),
    creadoPor: v.optional(v.string()),
    creadoPorXp: v.optional(v.string()),
    creadoAt: v.number(),
    ultimaActualizacionEstado: v.optional(v.number()),
  }).index('by_module', ['moduleId']),
});
