'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Building2 } from 'lucide-react';
import { Proveedor } from '@/types/compras';

interface ProveedorSelectorProps {
  proveedores: Proveedor[];
  value: string;
  onChange: (proveedorId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ProveedorSelector({
  proveedores,
  value,
  onChange,
  placeholder = 'Buscar proveedor...',
  disabled = false,
  className = '',
}: ProveedorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const proveedorSeleccionado = proveedores.find(p => p.id === value);

  // Filtrar proveedores
  const filteredProveedores = searchTerm.trim()
    ? proveedores.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cuit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : proveedores;

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index cuando cambia el filtro
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  // Scroll al item seleccionado
  useEffect(() => {
    if (listRef.current && filteredProveedores.length > 0 && isOpen) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredProveedores, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredProveedores.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProveedores.length > 0) {
          handleSelect(filteredProveedores[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (proveedor: Proveedor) => {
    onChange(proveedor.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input principal */}
      <div
        className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
          disabled
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
            : isOpen
            ? 'border-palette-purple ring-2 ring-palette-purple/20'
            : 'border-border hover:border-gray-400'
        }`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />

        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
            className="flex-1 outline-none bg-transparent text-sm"
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${proveedorSeleccionado ? 'text-text-primary' : 'text-gray-400'}`}>
            {proveedorSeleccionado ? proveedorSeleccionado.nombre : placeholder}
          </span>
        )}

        {value && !isOpen && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}

        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-hidden">
          {/* Lista de proveedores */}
          <div className="overflow-y-auto max-h-[250px]">
            {filteredProveedores.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No se encontraron proveedores
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="block mx-auto mt-1 text-xs text-palette-purple hover:underline"
                  >
                    Limpiar busqueda
                  </button>
                )}
              </div>
            ) : (
              <ul ref={listRef}>
                {filteredProveedores.map((prov, index) => (
                  <li
                    key={prov.id}
                    className={`px-4 py-2.5 cursor-pointer transition-colors ${
                      index === selectedIndex
                        ? 'bg-palette-purple/10'
                        : 'hover:bg-gray-50'
                    } ${prov.id === value ? 'bg-palette-purple/5' : ''}`}
                    onClick={() => handleSelect(prov)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {prov.nombre}
                        </div>
                        <div className="text-xs text-gray-500 flex gap-2">
                          <span>ID: {prov.id}</span>
                          {prov.cuit && <span>CUIT: {prov.cuit}</span>}
                        </div>
                      </div>
                      {prov.id === value && (
                        <div className="w-2 h-2 rounded-full bg-palette-purple flex-shrink-0" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between">
            <span>{filteredProveedores.length} proveedores</span>
            <span>↑↓ navegar · Enter seleccionar · Esc cerrar</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProveedorSelector;
