'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCompras } from '@/lib/compras-context';
import { useParametros } from '@/hooks/compras';
import { AdjuntosUpload } from '@/components/compras/AdjuntosUpload';
import { ItemsTable } from '@/components/compras/ItemsTable';
import { Button } from '@/components/ui/Button';
import { Prioridad, Requerimiento, ItemRequerimiento, Adjunto } from '@/types/compras';
import { ChevronLeft, Save, Send } from 'lucide-react';

interface AdjuntoFile {
  id: string;
  file: File;
  nombre: string;
  tamanio: number;
  tipo: string;
}

export default function NuevoRequerimientoPage() {
  const router = useRouter();
  const { usuarioActual, agregarRequerimiento } = useCompras();
  const { centrosCostos, categorias, prioridades } = useParametros();

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    centroCostos: '',
    categoria: '',
    prioridad: 'NORMAL' as Prioridad,
    fechaNecesaria: '',
    justificacion: '',
  });

  const [items, setItems] = useState<ItemRequerimiento[]>([
    {
      id: 'item-1',
      descripcion: '',
      cantidad: 1,
      unidad: 'Unidad',
      precioUnitario: 0,
      total: 0,
    },
  ]);

  const [adjuntos, setAdjuntos] = useState<AdjuntoFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El titulo es requerido';
    }
    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripcion es requerida';
    }
    if (!formData.centroCostos) {
      newErrors.centroCostos = 'Seleccione un centro de costos';
    }
    if (!formData.categoria) {
      newErrors.categoria = 'Seleccione una categoria';
    }
    if (!formData.justificacion.trim()) {
      newErrors.justificacion = 'La justificacion es requerida';
    }
    if (items.length === 0 || items.every((i) => !i.descripcion)) {
      newErrors.items = 'Agregue al menos un item';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (enviar: boolean) => {
    if (enviar && !validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Generar numero de requerimiento
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(5, '0');
      const numero = `REQ-${year}-${randomNum}`;

      // Convertir adjuntos a formato final (mock)
      const adjuntosFinal: Adjunto[] = adjuntos.map((adj) => ({
        id: adj.id,
        nombre: adj.nombre,
        tipo: adj.tipo,
        tamanio: adj.tamanio,
        url: `/mock/${adj.nombre}`, // URL mock
        fechaSubida: new Date(),
      }));

      // Calcular monto total
      const montoTotal = items.reduce((sum, item) => sum + item.total, 0);

      const nuevoRequerimiento: Requerimiento = {
        id: `req-${Date.now()}`,
        numero,
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        solicitanteId: usuarioActual.id,
        solicitante: usuarioActual,
        departamento: usuarioActual.departamento,
        centroCostos: formData.centroCostos,
        categoria: formData.categoria,
        prioridad: formData.prioridad,
        items: items.filter((i) => i.descripcion.trim() !== ''),
        montoEstimado: montoTotal,
        moneda: 'ARS',
        fechaCreacion: new Date(),
        fechaNecesaria: formData.fechaNecesaria
          ? new Date(formData.fechaNecesaria)
          : undefined,
        adjuntos: adjuntosFinal,
        justificacion: formData.justificacion,
        estado: enviar ? 'PENDIENTE_APROBACION' : 'BORRADOR',
      };

      agregarRequerimiento(nuevoRequerimiento);

      // Simular delay de red
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirect
      router.push('/compras/requerimientos');
    } catch (error) {
      console.error('Error al crear requerimiento:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/compras/requerimientos"
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Nuevo Requerimiento
            </h1>
            <p className="text-text-secondary">Complete los datos del requerimiento</p>
          </div>
        </div>

        <form className="space-y-6">
          {/* Informacion General */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Informacion General
            </h2>

            <div className="space-y-4">
              {/* Titulo */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Titulo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  placeholder="Ej: Notebooks Dell XPS para equipo de desarrollo"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.titulo ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.titulo && (
                  <p className="text-sm text-red-500 mt-1">{errors.titulo}</p>
                )}
              </div>

              {/* Descripcion */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Descripcion <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describa brevemente que necesita y por que"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.descripcion ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.descripcion && (
                  <p className="text-sm text-red-500 mt-1">{errors.descripcion}</p>
                )}
              </div>

              {/* Row: Centro de Costos y Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Centro de Costos <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="centroCostos"
                    value={formData.centroCostos}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.centroCostos ? 'border-red-500' : 'border-border'
                    }`}
                  >
                    <option value="">Seleccione...</option>
                    {centrosCostos.map((cc) => (
                      <option key={cc.id} value={cc.nombre}>
                        {cc.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.centroCostos && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.centroCostos}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.categoria ? 'border-red-500' : 'border-border'
                    }`}
                  >
                    <option value="">Seleccione...</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.nombre}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.categoria && (
                    <p className="text-sm text-red-500 mt-1">{errors.categoria}</p>
                  )}
                </div>
              </div>

              {/* Row: Prioridad y Fecha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Prioridad <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="prioridad"
                    value={formData.prioridad}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {prioridades.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Fecha Necesaria
                  </label>
                  <input
                    type="date"
                    name="fechaNecesaria"
                    value={formData.fechaNecesaria}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items del Requerimiento */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Items del Requerimiento
            </h2>
            <ItemsTable items={items} onItemsChange={setItems} />
            {errors.items && (
              <p className="text-sm text-red-500 mt-2">{errors.items}</p>
            )}
          </div>

          {/* Documentacion Adjunta */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Documentacion Adjunta
            </h2>
            <AdjuntosUpload adjuntos={adjuntos} onAdjuntosChange={setAdjuntos} />
          </div>

          {/* Justificacion */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Justificacion
            </h2>
            <textarea
              name="justificacion"
              value={formData.justificacion}
              onChange={handleChange}
              rows={4}
              placeholder="Explique por que es necesaria esta compra, que problema resuelve, etc."
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.justificacion ? 'border-red-500' : 'border-border'
              }`}
            />
            {errors.justificacion && (
              <p className="text-sm text-red-500 mt-1">{errors.justificacion}</p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-4 pb-8">
            <Link
              href="/compras/requerimientos"
              className="px-6 py-2 text-text-secondary hover:text-text-primary font-medium"
            >
              Cancelar
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Borrador
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              loading={submitting}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar a Aprobacion
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
