const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// Configurar SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('🔧 SendGrid configurado exitosamente');
} else {
  console.warn('⚠️ SendGrid API key no encontrada');
}

// Configuraciones predefinidas para proveedores populares
const proveedoresEmail = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    requireTLS: true
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false
  },
  // Para servicios personalizados
  custom: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true'
  }
};

// Configurar transporter con soporte para múltiples proveedores
const crearTransporter = () => {
  // Detectar proveedor basado en el email del usuario
  let config;
  const emailUser = process.env.EMAIL_USER || '';
  
  if (emailUser.includes('@gmail.com')) {
    config = proveedoresEmail.gmail;
  } else if (emailUser.includes('@outlook.com') || emailUser.includes('@hotmail.com')) {
    config = proveedoresEmail.outlook;
  } else if (emailUser.includes('@yahoo.com')) {
    config = proveedoresEmail.yahoo;
  } else {
    config = proveedoresEmail.custom;
  }

  return nodemailer.createTransport({
    ...config,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Opciones adicionales para mejor compatibilidad y timeouts
    connectionTimeout: 10000, // 10 segundos para conectar
    greetingTimeout: 5000,    // 5 segundos para el saludo inicial
    socketTimeout: 15000,     // 15 segundos para operaciones de socket
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    },
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development'
  });
};

// Plantillas de email
const plantillas = {
  bienvenida: (nombre, codigoVerificacion) => ({
    subject: 'Bienvenido a Andino Express',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Bienvenido a Andino Express</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Ecommerce y logística premium para Colombia</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-top: 0;">Hola ${nombre},</h2>
          <p style="color: #374151; line-height: 1.6;">
            Gracias por crear tu cuenta. Desde ahora puedes comprar, vender y gestionar pedidos con una experiencia clara y segura.
          </p>
          <p style="color: #374151; line-height: 1.6;">
            Para completar tu registro, ingresa este código de verificación en la aplicación:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #1D4ED8; color: white; padding: 20px 40px; display: inline-block; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${codigoVerificacion}
            </div>
          </div>
          <p style="color: #374151; line-height: 1.6; text-align: center;">
            Este código es válido por <strong>15 minutos</strong>
          </p>
          <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            Si no solicitaste este registro, puedes ignorar este mensaje.
          </p>
        </div>
      </div>
    `
  }),

  recuperarPassword: (nombre, tokenRecuperacion) => ({
    subject: 'Recuperar contraseña - Andino Express',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #EF4444; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Recuperar contraseña</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Andino Express</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-top: 0;">Hola ${nombre},</h2>
          <p style="color: #374151; line-height: 1.6;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/restablecer-password?token=${tokenRecuperacion}" 
               style="background: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color: #EF4444; font-size: 14px; font-weight: bold;">
            Este enlace expirará en 1 hora por seguridad.
          </p>
        </div>
      </div>
    `
  })
};

// Función principal para enviar emails - SendGrid primero, SMTP como backup
const enviarEmail = async (para, tipo, datos) => {
  console.log(`🚀 Iniciando envío de email tipo '${tipo}' a: ${para}`);
  
  try {
    const plantilla = plantillas[tipo];
    if (!plantilla) {
      throw new Error(`Plantilla de email '${tipo}' no encontrada`);
    }
    
    const { subject, html } = plantilla(...datos);

    // 1. INTENTAR CON SENDGRID PRIMERO
    if (process.env.SENDGRID_API_KEY) {
      try {
        console.log('🔄 Intentando envío via SendGrid...');
        
        const mensaje = {
          to: para,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || 'noreply@andinoexpress.com',
            name: process.env.SENDGRID_FROM_NAME || 'Andino Express'
          },
          subject: subject,
          html: html
        };

        console.log('📧 Enviando email via SendGrid:');
        console.log(`   - Para: ${para}`);
        console.log(`   - De: ${mensaje.from.name} <${mensaje.from.email}>`);
        console.log(`   - Asunto: ${subject}`);

        const resultado = await sgMail.send(mensaje);
        console.log('✅ Email enviado exitosamente via SendGrid');
        console.log(`📊 Message ID: ${resultado[0].headers['x-message-id']}`);
        console.log(`📈 Status Code: ${resultado[0].statusCode}`);

        return {
          exito: true,
          messageId: resultado[0].headers['x-message-id'],
          proveedor: 'SendGrid',
          statusCode: resultado[0].statusCode
        };

      } catch (sendGridError) {
        console.error('❌ Error con SendGrid:', sendGridError.message);
        console.log('🔄 Intentando con SMTP como backup...');
        // Continuar con SMTP como backup
      }
    } else {
      console.log('⚠️ SendGrid no configurado, usando SMTP...');
    }

    // 2. BACKUP CON SMTP SI SENDGRID FALLA
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ Ningún servicio de email configurado - modo desarrollo');
      console.log(`📧 [DEV MODE] Would send ${tipo} email to: ${para}`);
      
      if (tipo === 'bienvenida' && datos[1]) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🔑 CÓDIGO DE VERIFICACIÓN: ${datos[1]}`);
        console.log(`📧 Para: ${para}`);
        console.log(`👤 Nombre: ${datos[0]}`);
        console.log(`⏰ Válido por: 15 minutos`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }
      
      return {
        exito: true,
        messageId: 'dev-mode-no-email',
        warning: 'Ningún servicio de email configurado'
      };
    }

    const transporter = crearTransporter();
    
    console.log('📤 Enviando via SMTP...');
    const resultado = await Promise.race([
      transporter.sendMail({
        from: `"Andino Express" <${process.env.EMAIL_USER}>`,
        to: para,
        subject: subject,
        html: html
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);
    
    console.log('✅ Email enviado via SMTP:', resultado.messageId);
    return {
      exito: true,
      messageId: resultado.messageId,
      proveedor: 'SMTP'
    };

  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    return {
      exito: false,
      error: error.message
    };
  }
};

// Funciones específicas para cada tipo de email
const enviarEmailBienvenida = (email, nombre, codigoVerificacion) => {
  return enviarEmail(email, 'bienvenida', [nombre, codigoVerificacion]);
};

const enviarEmailRecuperacion = (email, nombre, tokenRecuperacion) => {
  return enviarEmail(email, 'recuperarPassword', [nombre, tokenRecuperacion]);
};

// Función para probar la configuración de email
const probarConfiguracionEmail = async () => {
  try {
    console.log('\n📧 Probando configuración de email...\n');

    // Verificar variables de entorno
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('❌ Variables de entorno no configuradas:');
      console.log('   - EMAIL_USER:', process.env.EMAIL_USER ? '✓' : '✗');
      console.log('   - EMAIL_PASS:', process.env.EMAIL_PASS ? '✓' : '✗');
      console.log('\n💡 Configura estas variables en tu archivo .env\n');
      return false;
    }

    console.log('✓ Variables de entorno configuradas');
    console.log('  EMAIL_USER:', process.env.EMAIL_USER);
    console.log('  Proveedor detectado:', detectarProveedor(process.env.EMAIL_USER));

    // Crear transporter y verificar conexión
    const transporter = crearTransporter();
    console.log('\n🔄 Verificando conexión SMTP...');
    
    await transporter.verify();
    console.log('✅ Conexión SMTP exitosa!\n');

    // Enviar email de prueba
    console.log('📨 Enviando email de prueba...');
    const testCode = '123456';
    const resultado = await enviarEmailBienvenida(
      process.env.EMAIL_USER,
      'Usuario de Prueba',
      testCode
    );

    if (resultado.exito) {
      console.log('✅ Email de prueba enviado exitosamente!');
      console.log('   Message ID:', resultado.messageId);
      console.log('\n🎉 Configuración de email lista para usar!\n');
      return true;
    } else {
      console.log('❌ Error enviando email:', resultado.error);
      return false;
    }

  } catch (error) {
    console.error('\n❌ Error en configuración de email:', error.message);
    console.log('\n📋 Guía de solución de problemas:');
    
    if (error.message.includes('Invalid login')) {
      console.log('  • Verifica que EMAIL_USER y EMAIL_PASS sean correctos');
      console.log('  • Para Gmail, usa una App Password (no tu contraseña normal)');
      console.log('  • Activa "Acceso de aplicaciones menos seguras" si es necesario');
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      console.log('  • Verifica tu conexión a internet');
      console.log('  • Revisa que el puerto SMTP esté correcto (587 para TLS, 465 para SSL)');
      console.log('  • Verifica que tu firewall no esté bloqueando la conexión');
    }

    console.log('\n');
    return false;
  }
};

// Función auxiliar para detectar proveedor
const detectarProveedor = (email) => {
  if (email.includes('@gmail.com')) return 'Gmail';
  if (email.includes('@outlook.com') || email.includes('@hotmail.com')) return 'Outlook';
  if (email.includes('@yahoo.com')) return 'Yahoo';
  return 'Personalizado';
};

module.exports = {
  enviarEmail,
  enviarEmailBienvenida,
  enviarEmailRecuperacion,
  probarConfiguracionEmail,
  crearTransporter
}; 