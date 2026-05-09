import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { prisma } from "$utils/prisma";
import UserUtils from "$utils/user";
import { sendEmail } from "$lib/email/resend";
import { encript_string } from "$utils/encript";
import { Permissions } from "$lib/permissions";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, "/auth");
  }

  const user_data = {
    id: locals.user.id,
    email: locals.user.email,
    nombre: locals.user.nombre,
    apodo: locals.user.apodo,
  };
  return { user: user_data };
};

export const actions = {
  set_user: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { success: false, message: "No autorizado" });
    }

    const formData = await request.formData();
    const apodoRaw = (formData.get("apodo") as string | null)?.trim() ?? "";
    const apodo = apodoRaw.length > 0 ? apodoRaw : null;

    await prisma.user.update({
      where: {
        id: locals.user.id,
      },
      data: {
        apodo,
      },
    });

    return {
      success: true,
      message: "Apodo actualizado correctamente",
    };
  },
  set_name: async ({ request, locals, cookies }) => {
    if (!locals.user) {
      return fail(401, { success: false, message: "No autorizado" });
    }

    const formData = await request.formData();
    const nombre = (formData.get("nombre") as string | null)?.trim() ?? "";

    if (nombre.length < 3) {
      return fail(400, {
        success: false,
        message: "El nombre debe tener al menos 3 caracteres",
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: {
        id: locals.user.id,
      },
    });

    if (!dbUser) {
      return fail(404, {
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const canAcceptMembers = await UserUtils.has_permission(
      dbUser,
      Permissions.AceptarMiembros,
    );

    if (canAcceptMembers) {
      await prisma.user.update({
        where: {
          id: locals.user.id,
        },
        data: {
          nombre,
          aprobado_por_admin: true,
          rechazado_por_admin: false,
        },
      });

      return {
        success: true,
        message: "Nombre actualizado correctamente",
        willBlock: false,
      };
    }

    await prisma.user.update({
      where: {
        id: locals.user.id,
      },
      data: {
        nombre,
        aprobado_por_admin: false,
        rechazado_por_admin: false,
      },
    });

    cookies.delete("token", { path: "/" });
    cookies.delete("refreshToken", { path: "/" });

    throw redirect(
      302,
      "/auth?error=Nombre actualizado. Tu cuenta fue bloqueada hasta que un administrador valide este cambio.",
    );
  },
  set_email: async ({ request, locals, cookies }) => {
    if (!locals.user) {
      return fail(401, { success: false, message: "No autorizado" });
    }

    const formData = await request.formData();
    const email =
      (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";

    if (!email) {
      return fail(400, {
        success: false,
        message: "El correo es requerido",
      });
    }

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmailValid) {
      return fail(400, {
        success: false,
        message: "Correo inválido",
      });
    }

    const emailExists = await prisma.user.findFirst({
      where: {
        email,
        id: {
          not: locals.user.id,
        },
      },
      select: { id: true },
    });

    if (emailExists) {
      return fail(400, {
        success: false,
        message: "Ya existe una cuenta con ese correo",
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: {
        id: locals.user.id,
      },
    });

    if (!dbUser) {
      return fail(404, {
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const canAcceptMembers = await UserUtils.has_permission(
      dbUser,
      Permissions.AceptarMiembros,
    );

    if (canAcceptMembers) {
      await prisma.user.update({
        where: {
          id: locals.user.id,
        },
        data: {
          email,
          es_valido: true,
        },
      });

      await sendEmailNotification(email, locals.user.email);

      return {
        success: true,
        message: "Correo actualizado correctamente",
        willBlock: false,
      };
    }

    await prisma.user.update({
      where: {
        id: locals.user.id,
      },
      data: {
        email,
        es_valido: false,
      },
    });

    await sendEmailValidator(email);

    cookies.delete("token", { path: "/" });
    cookies.delete("refreshToken", { path: "/" });

    throw redirect(
      302,
      "/auth?error=Correo actualizado. Debes validar nuevamente tu cuenta desde tu nuevo correo.",
    );
  },
  set_password: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { success: false, message: "No autorizado" });
    }

    const formData = await request.formData();
    const current_password =
      (formData.get("current_password") as string | null) ?? "";
    const new_password = (formData.get("new_password") as string | null) ?? "";
    const confirm_password =
      (formData.get("confirm_password") as string | null) ?? "";

    if (!current_password || !new_password || !confirm_password) {
      return fail(400, {
        success: false,
        message: "Todos los campos de contraseña son requeridos",
      });
    }

    if (new_password.length < 8) {
      return fail(400, {
        success: false,
        message: "La nueva contraseña debe tener al menos 8 caracteres",
      });
    }

    if (new_password !== confirm_password) {
      return fail(400, {
        success: false,
        message: "Las nuevas contraseñas no coinciden",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: locals.user.id,
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return fail(404, {
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const isCurrentPasswordValid = UserUtils.verifyPassword(
      current_password,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      return fail(400, {
        success: false,
        message: "La contraseña actual es incorrecta",
      });
    }

    const isSamePassword = UserUtils.verifyPassword(
      new_password,
      user.password,
    );
    if (isSamePassword) {
      return fail(400, {
        success: false,
        message: "La nueva contraseña debe ser diferente a la actual",
      });
    }

    const hashedPassword = UserUtils.hashPassword(new_password);
    await prisma.user.update({
      where: {
        id: locals.user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return {
      success: true,
      message: "Contraseña actualizada correctamente",
    };
  },
} satisfies Actions;

const sendEmailValidator = async (to: string) => {
  const validationKey = encript_string(to);
  const uriDirectory = process.env.URI_DIRECTORY || "http://localhost:3000/";

  const subject = "Valida tu nuevo correo en GGOO";
  const html = `<p>Hola ${to},</p>
  <p>Recibimos una solicitud para cambiar el correo de tu cuenta en GGOO.</p>
  <h3>Para validar tu nuevo correo, haz clic en el siguiente enlace:</h3>
  <a href="${uriDirectory}auth/verify?code=${validationKey}">Validar nuevo correo</a>
  <p>Hasta validar este correo no podrás ingresar a la plataforma.</p>
  <p>Si no realizaste este cambio, puedes ignorar este mensaje.</p>`;

  await sendEmail(to, subject, html);
};

const sendEmailNotification = async (newEmail: string, oldEmail: string) => {
  const subject = "Tu correo en GGOO ha sido actualizado";
  const html = `<p>Hola,</p>
  <p>Te notificamos que el correo asociado a tu cuenta en ${process.env.APP_NAME ?? "GGOO"} ha sido actualizado.</p>
  <p><strong>Correo anterior:</strong> ${oldEmail}</p>
  <p><strong>Correo nuevo:</strong> ${newEmail}</p>
  <p>Si no realizaste este cambio, por favor contacta al equipo de soporte inmediatamente.</p>
  <p>Saludos,<br/>El equipo de ${process.env.APP_NAME ?? "GGOO"}</p>`;
  await sendEmail(newEmail, subject, html);
};
