import { query } from './_generated/server';
import { v } from 'convex/values';

export const login = query({
  args: {
    correoEmpresa: v.string(),
    xp: v.string(),
  },
  handler: async (ctx, args) => {
    // Buscar proveedor por correo empresa
    const provider = await ctx.db
      .query('providers')
      .filter((q) => q.eq(q.field('correoEmpresa'), args.correoEmpresa))
      .first();

    if (!provider) {
      return { success: false, message: 'Correo no encontrado' };
    }

    // Validar XP como contraseña (comparación directa)
    if (provider.xp !== args.xp) {
      return { success: false, message: 'Credenciales incorrectas' };
    }

    // Validar que esté activo (permitir "Activo" o "activo")
    const estadoLower = provider.estado?.toLowerCase();
    if (estadoLower !== 'activo') {
      return {
        success: false,
        message: `Usuario con estado: ${provider.estado}. Debe estar "Activo" para ingresar.`,
      };
    }

    // Login exitoso
    return {
      success: true,
      user: {
        _id: provider._id,
        nombre: provider.nombre,
        xp: provider.xp,
        correoEmpresa: provider.correoEmpresa,
        perfil: provider.perfil,
        tipo: provider.tipo,
        estado: provider.estado,
      },
    };
  },
});
