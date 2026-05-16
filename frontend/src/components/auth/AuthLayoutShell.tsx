import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { BRAND_NAME } from '../nav/navData';

export interface AuthLayoutShellProps {
  title: string;
  subtitle?: string;
  /** Enlace secundario bajo el título (ej. “¿No tienes cuenta?”) */
  footerLink?: { to: string; label: string; hint?: string };
  children: React.ReactNode;
}

/**
 * Layout premium compartido (login, registro, recuperación).
 * Mobile-first: una columna; en lg, panel lateral con marca sobria.
 */
export const AuthLayoutShell: React.FC<AuthLayoutShellProps> = ({
  title,
  subtitle,
  footerLink,
  children,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        <aside
          className={cn(
            'relative hidden shrink-0 border-b border-accent-800/20 bg-accent-900 text-white lg:flex lg:w-[42%] lg:flex-col lg:border-b-0 lg:border-r',
            'px-10 py-12 xl:px-14',
          )}
          aria-label="Marca y contexto de la plataforma"
        >
          <div className="flex flex-1 flex-col justify-between gap-10">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-primary-200">
                {BRAND_NAME}
              </p>
              <h1 className="mt-4 font-display text-2xl font-semibold leading-tight text-white xl:text-3xl">
                Operaciones B2B y retail con la misma plataforma.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-100/90">
                Acceso seguro a pedidos, catálogo y pagos. Diseñado para equipos que necesitan claridad,
                trazabilidad y una experiencia seria en cada sesión.
              </p>
            </div>
            <p className="text-xs text-primary-200/80">
              Si detectas actividad inusual, cierra sesión y contacta a soporte.
            </p>
          </div>
        </aside>

        <main className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:px-12 lg:py-14">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-soft sm:p-8">
              <header className="mb-8 space-y-2 text-center lg:text-left">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-gray-900">{title}</h2>
                {subtitle ? <p className="text-sm text-gray-600">{subtitle}</p> : null}
                {footerLink ? (
                  <p className="text-sm text-gray-600">
                    {footerLink.hint ? `${footerLink.hint} ` : null}
                    <Link
                      to={footerLink.to}
                      className="font-medium text-primary-600 underline-offset-4 hover:text-primary-700 hover:underline"
                    >
                      {footerLink.label}
                    </Link>
                  </p>
                ) : null}
              </header>
              {children}
            </div>
            <p className="mt-6 text-center text-xs text-gray-500 lg:text-left">
              Al continuar aceptas el uso responsable de la plataforma y nuestras políticas de privacidad.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthLayoutShell;
