#!/bin/bash

echo "🔍 Buscando procesos en los puertos 3000-3005 y 4000-4005..."

killed_any=false

# Matar procesos en el rango 3000-3005
for port in {3000..3005}; do
  # Usar fuser primero, si no funciona usar lsof, y como último recurso usar ss
  PID=$(fuser $port/tcp 2>/dev/null | awk '{print $1}')

  if [ -z "$PID" ]; then
    PID=$(lsof -ti:$port 2>/dev/null)
  fi

  if [ -z "$PID" ]; then
    PID=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)
  fi

  if [ -n "$PID" ]; then
    echo "❌ Matando proceso en puerto $port (PID: $PID)"
    kill -9 $PID 2>/dev/null
    killed_any=true
  fi
done

# Matar procesos en el rango 4000-4005
for port in {4000..4005}; do
  # Usar fuser primero, si no funciona usar lsof, y como último recurso usar ss
  PID=$(fuser $port/tcp 2>/dev/null | awk '{print $1}')

  if [ -z "$PID" ]; then
    PID=$(lsof -ti:$port 2>/dev/null)
  fi

  if [ -z "$PID" ]; then
    PID=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)
  fi

  if [ -n "$PID" ]; then
    echo "❌ Matando proceso en puerto $port (PID: $PID)"
    kill -9 $PID 2>/dev/null
    killed_any=true
  fi
done

echo ""
if [ "$killed_any" = true ]; then
  echo "✅ Procesos terminados en puertos 3000-3005 y 4000-4005"
else
  echo "✅ No se encontraron procesos en los puertos 3000-3005 y 4000-4005"
fi
