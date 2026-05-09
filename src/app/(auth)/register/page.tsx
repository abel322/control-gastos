"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, Mail, Lock, User, Loader2 } from "lucide-react";
import { registerUser } from "../../(dashboard)/actions";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await registerUser(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Crea tu cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Empieza a controlar tus gastos bimonetarios hoy mismo
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nombre</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  name="name"
                  type="text"
                  required
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Tu nombre"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  name="email"
                  type="email"
                  required
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  name="password"
                  type="password"
                  required
                  className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Registrarse"
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:text-primary-dark"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
