export interface RendicionItem {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  categoria?: string;
  estado?: string;
  observaciones?: string;
  comprobante?: string;
  [key: string]: any;
}

export interface Rendicion {
  id: string;
  numeroTarjeta: string;
  periodo: string;
  estado: string;
  items: RendicionItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}
