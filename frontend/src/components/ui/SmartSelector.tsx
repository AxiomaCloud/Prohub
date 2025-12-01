'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';

export interface SelectorOption {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  extra?: Record<string, any>;
}

interface SmartSelectorProps {
  value: string;
  options: SelectorOption[];
  loading?: boolean;
  onSelect: (option: SelectorOption) => void;
  onClose: () => void;
  onSearch?: (term: string) => void;
  position: { x: number; y: number };
  placeholder?: string;
  className?: string;
}

export const SmartSelector: React.FC<SmartSelectorProps> = ({
  value,
  options,
  loading = false,
  onSelect,
  onClose,
  onSearch,
  position,
  placeholder = 'Buscar...',
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [filteredOptions, setFilteredOptions] = useState<SelectorOption[]>(options);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filtrar opciones localmente cuando cambia el término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = options.filter(opt =>
        opt.codigo.toLowerCase().includes(term) ||
        opt.nombre.toLowerCase().includes(term) ||
        opt.descripcion?.toLowerCase().includes(term)
      );
      setFilteredOptions(filtered);
    }
    setSelectedIndex(0);
  }, [searchTerm, options]);

  // Notificar búsqueda al padre si tiene handler
  useEffect(() => {
    if (onSearch) {
      const timeout = setTimeout(() => {
        onSearch(searchTerm);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [searchTerm, onSearch]);

  // Focus en el input al montar
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, []);

  // Scroll al item seleccionado
  useEffect(() => {
    if (listRef.current && filteredOptions.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, filteredOptions]);

  // Manejo de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredOptions.length > 0 && selectedIndex >= 0) {
          onSelect(filteredOptions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredOptions, selectedIndex, onSelect, onClose]);

  // Calcular posición del popup
  const popupStyle = React.useMemo(() => {
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      width: '400px',
      maxHeight: '400px',
    };

    // Ajustar posición horizontal
    if (position.x + 400 > window.innerWidth) {
      style.right = Math.max(10, window.innerWidth - position.x);
    } else {
      style.left = position.x;
    }

    // Ajustar posición vertical
    if (position.y + 400 > window.innerHeight) {
      style.bottom = Math.max(10, window.innerHeight - position.y + 10);
    } else {
      style.top = position.y;
    }

    return style;
  }, [position]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={containerRef}
        className={`flex flex-col bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden ${className}`}
        style={popupStyle}
      >
        {/* Header con búsqueda */}
        <div className="flex-shrink-0 p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de opciones */}
        <div className="flex-1 overflow-y-auto max-h-[300px]">
          {loading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin inline-block w-5 h-5 border-2 border-palette-purple border-t-transparent rounded-full mr-2"></div>
              Cargando...
            </div>
          )}

          {!loading && filteredOptions.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No se encontraron resultados</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-1 text-xs text-palette-purple hover:underline"
                >
                  Limpiar busqueda
                </button>
              )}
            </div>
          )}

          {!loading && filteredOptions.length > 0 && (
            <ul ref={listRef} className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={option.id}
                  className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                    index === selectedIndex
                      ? 'bg-palette-purple/10 text-palette-purple'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelect(option)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {option.nombre}
                      </div>
                      {option.descripcion && option.descripcion !== option.nombre && (
                        <div className="text-xs text-gray-500 truncate">
                          {option.descripcion}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-gray-400 font-mono">
                        {option.codigo}
                      </span>
                      {index === selectedIndex && (
                        <ChevronRight className="h-4 w-4 text-palette-purple" />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer con ayuda */}
        {!loading && filteredOptions.length > 0 && (
          <div className="flex-shrink-0 px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>↑↓ navegar</span>
              <span>Enter seleccionar</span>
              <span>Esc cerrar</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SmartSelector;
