# Imagen base con Python y Node.js
FROM python:3.13-slim

# Instalar Node.js, npm, y dependencias necesarias
RUN apt-get update && \
    apt-get install -y curl gnupg2 build-essential && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get install -y sshpass

# Instalar Ansible y dependencias de community.general
RUN pip install --no-cache-dir ansible && \
    ansible-galaxy collection install community.general

# Crear directorio de trabajo
WORKDIR /app

# Copiar scripts, playbooks, inventario y archivos necesarios
COPY . /app

# Establecer permisos si es necesario
RUN chmod -R 755 /app

# Instalar dependencias Node.js si las tienes
RUN if [ -f package.json ]; then npm install; fi

# Comando por defecto: ejecutar el playbook
CMD ["ansible-playbook", "-i", "inventory", "playbooks/archivosorganizados.yml"]
