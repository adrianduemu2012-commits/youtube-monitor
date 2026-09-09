# 🎬 YouTube Monitor - Discord Notifier

Automáticamente monitorea el canal de YouTube @mnt_manuti y envía notificaciones a Discord cada 15 minutos.

## ✅ Archivos que necesitas

Este proyecto tiene solo **1 archivo:**

```
.github/workflows/youtube-monitor.yml
```

## 📋 Estructura del proyecto

```
youtube-monitor/
├── .github/
│   └── workflows/
│       └── youtube-monitor.yml
└── README.md
```

## 🚀 Pasos para configurar

### 1️⃣ Crear el repositorio
```bash
git clone https://github.com/TU_USUARIO/youtube-monitor.git
cd youtube-monitor
```

### 2️⃣ Crear las carpetas
```bash
mkdir -p .github/workflows
```

### 3️⃣ Agregar el archivo workflow
- Copia el contenido de `youtube-monitor.yml`
- Crea el archivo en: `.github/workflows/youtube-monitor.yml`
- Pega el contenido

### 4️⃣ Subir a GitHub
```bash
git add .
git commit -m "Add YouTube monitor workflow"
git push origin main
```

### 5️⃣ Agregar el Secret
1. Ve a tu repo en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. **Name:** `DISCORD_WEBHOOK`
5. **Value:** 
```
https://discord.com/api/webhooks/1546965033613918404/7ptzXA9cdoKyoqPM8pOEwtKSxX8qP3YMD_yZfUUNWUOP6E1Wrs5iv4pn2m9ufaSHIF_r
```
6. Click "Add secret"

### 6️⃣ Prueba
- Ve a Actions en tu repo
- Click en "YouTube Monitor @mnt_manuti"
- Click "Run workflow"
- ¡Revisa Discord! 🎉

## 📊 Configuración

El workflow se ejecuta:
- ✅ Automáticamente cada 15 minutos
- ✅ Manualmente cuando lo solicites desde Actions
- ✅ 24/7 sin necesidad de servidor

## 🔧 Para cambiar la frecuencia

En `.github/workflows/youtube-monitor.yml`, línea 4:

```yaml
- cron: '*/15 * * * *'
```

Cambia el número:
- `*/5` = cada 5 minutos
- `*/10` = cada 10 minutos
- `*/30` = cada 30 minutos
- `0 * * * *` = cada hora

## 📝 Notas

- GitHub da 2000 minutos/mes gratis
- El workflow usa tu YouTube API key y webhook de Discord
- No necesita servidor local corriendo

¡Listo! 🚀
