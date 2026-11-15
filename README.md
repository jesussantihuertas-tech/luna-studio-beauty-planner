# Luna Studio Beauty Planner — app móvil inicial

Proyecto base para Android y iPhone con Expo + Supabase. Incluye:
- Registro e inicio de sesión.
- Perfil de clienta y perfil administrador.
- Solicitud de citas de uñas o pestañas.
- Aceptación/rechazo desde el panel de Fátima.
- Registro de token push y función para avisar a los perfiles administradores.

## Importante
Este proyecto es el código inicial, no una app ya publicada. Para que las reservas y notificaciones funcionen en teléfonos reales hay que crear/configurar el proyecto Supabase y Expo, instalar dependencias y generar los builds. No se ha publicado en Google Play ni App Store.

## 1. Requisitos
- Node.js LTS instalado en una computadora.
- Una cuenta gratuita de Supabase.
- Una cuenta de Expo (expo.dev).
- Para publicar en tiendas: cuenta de Google Play y Apple Developer, sujetas a sus tarifas y requisitos.

## 2. Configurar la base de datos
1. Crea un proyecto en https://supabase.com.
2. Abre SQL Editor y ejecuta todo `supabase/schema.sql`.
3. En Project Settings > API copia Project URL y la clave anon/public.
4. Copia `.env.example` como `.env` y completa las dos variables `EXPO_PUBLIC_...`.
5. Registra la cuenta de Fátima desde la app.
6. En Supabase > Authentication > Users copia el UUID de esa cuenta.
7. En SQL Editor ejecuta el UPDATE comentado al final de `schema.sql`, sustituyendo el UUID. Esto convierte únicamente esa cuenta en administradora.

## 3. Configurar notificaciones push
1. Crea una cuenta en https://expo.dev e instala EAS CLI.
2. Ejecuta `npx eas login` y `npx eas project:init`.
3. Copia el `projectId` que EAS genere y reemplaza `REEMPLAZAR_CON_PROJECT_ID_DE_EAS` en `app.json`.
4. Despliega la función:
   `npx supabase functions deploy notify-admins`
5. Asegúrate de que la función tenga verificación JWT activada. Las variables estándar de Supabase se proporcionan al entorno de Edge Functions.
6. Abre sesión en el teléfono de Fátima, acepta el permiso de notificaciones y verifica que su perfil tenga `role = admin`.

## 4. Ejecutar en modo de prueba
Desde esta carpeta:
```bash
npm install
npx expo start
```
Escanea el QR con Expo Go para probar pantallas. Las notificaciones push deben probarse en un dispositivo físico y con un development/production build compatible; no dependas de Expo Go para validar el comportamiento final.

## 5. Generar instaladores
- Android APK de prueba: `npx eas build --platform android --profile preview`
- iPhone: `npx eas build --platform ios --profile production`

EAS te dará los enlaces de los builds. Para distribuir ampliamente, se deben completar los procesos de Google Play y App Store.

## 6. Antes de usarla con clientas
- Define horarios reales, duración de cada servicio, días de descanso y anticipación mínima.
- Añade validación para impedir solicitudes en horarios ocupados; esta versión inicial todavía no bloquea choques de horario.
- Configura políticas de privacidad y consentimiento para tratar nombre y teléfono.
- No compartas la clave `service_role` ni la incluyas en la app.
- Añade notificación a la clienta cuando Fátima acepte o rechace, si se desea.

## 7. Diseño y alcance de esta primera versión
Se conservó el estilo rosa pastel, rosa profundo y lila del HTML original. Se incluyeron los servicios Uñas y Pestañas. El calendario mensual del HTML original queda como siguiente mejora de interfaz; esta base prioriza el flujo de solicitud y aprobación en dos roles.
