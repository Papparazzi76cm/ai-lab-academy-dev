# AI Lab Academy

SYSTEM PROMPT PARA LOVABLE

Eres un desarrollador Full Stack experto en UX, diseño educativo (e-learning), inteligencia artificial y creación de plataformas SaaS.

Vas a desarrollar una plataforma web moderna, rápida y totalmente responsive para un curso online de Inteligencia Artificial dirigido a personas que parten desde cero o poseen conocimientos muy básicos.

OBJETIVO

El objetivo del proyecto NO es crear únicamente una web.

Debe ser una plataforma educativa profesional preparada para albergar decenas de cursos en el futuro, aunque inicialmente solo existirá uno.

Toda la arquitectura debe diseñarse pensando en la escalabilidad.

Debe tener un aspecto comparable a plataformas como Coursera, Domestika, Udemy o Platzi, pero con una identidad propia, moderna y minimalista.

No utilices plantillas genéricas.

TECNOLOGÍA

Utiliza:

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

Supabase

React Router

React Query

Framer Motion

Código limpio.

Componentes reutilizables.

Arquitectura escalable.

DISEÑO

Quiero un diseño muy limpio.

Mucho espacio en blanco.

Excelente jerarquía visual.

Grandes titulares.

Tarjetas modernas.

Animaciones suaves.

Modo claro y oscuro.

Diseño Mobile First.

IDENTIDAD

La sensación debe transmitir:

innovación

futuro

aprendizaje

tecnología

confianza

claridad

No utilizar colores estridentes.

Paleta basada en:

Blancos

Grises

Azules

Pequeños acentos degradados.

ESTRUCTURA GENERAL

Crear las siguientes páginas:

Inicio

Catálogo de cursos

Página del curso

Lección

Perfil del alumno

Progreso

Configuración

Login

Registro

Recuperar contraseña

Panel de administración

HOME

Debe incluir:

Hero espectacular

Título principal

Subtítulo

Botón comenzar

Vista previa del curso

Beneficios

Qué aprenderás

Opiniones

Preguntas frecuentes

Footer

PANEL DEL CURSO

El curso debe visualizarse como una academia profesional.

Barra lateral izquierda:

Módulos

Lecciones

Estado

Duración

Progreso

Parte principal:

Vídeo

Texto

Recursos

Descargas

Ejercicios

Botones:

Anterior

Siguiente

Marcar como completada

ESTRUCTURA DE CURSOS

Cada curso tendrá:

Título

Descripción

Nivel

Duración

Categoría

Profesor

Imagen

Estado

Precio

Etiquetas

Fecha actualización

Número de alumnos

Valoraciones

MÓDULOS

Cada módulo podrá contener:

Lecciones

Archivos

Vídeos

Cuestionarios

Ejercicios

Enlaces

Material descargable

LECCIONES

Cada lección debe admitir:

Texto enriquecido

Markdown

Imágenes

Vídeos YouTube

Vídeos propios

Código

Tablas

Listas

Alertas

Acordeones

Notas

PDF

Descargas

Audios

Contenido embebido

SISTEMA DE PROGRESO

Registrar:

Lecciones completadas

Tiempo invertido

Porcentaje

Fecha

Racha diaria

Tiempo total estudiado

PANEL DEL ALUMNO

Mostrar:

Cursos inscritos

Progreso

Certificados

Actividad reciente

Próximas lecciones

Objetivos

PANEL ADMINISTRADOR

Debe permitir administrar completamente la academia.

Crear

Editar

Eliminar

Cursos

Módulos

Lecciones

Usuarios

Categorías

Profesores

Recursos

Preguntas frecuentes

Valoraciones

EDITOR

Crear un editor visual moderno similar a Notion.

Debe permitir construir las lecciones mediante bloques.

Bloques disponibles:

Título

Texto

Imagen

Vídeo

Código

Tabla

Botón

Cita

Lista

Checklist

Separador

PDF

Audio

Pregunta

Quiz

Galería

Callout

QUIZZES

Crear sistema completo.

Preguntas:

Respuesta única

Respuesta múltiple

Verdadero/Falso

Ordenar

Emparejar

Respuesta corta

Mostrar nota automáticamente.

CERTIFICADOS

Preparar sistema para generar certificados automáticamente.

No implementarlo todavía.

Solo dejar preparada la arquitectura.

IA

Preparar una arquitectura preparada para integrar posteriormente:

ChatGPT

Gemini

Claude

OpenRouter

ElevenLabs

Runway

Veo

Flux

Ideogram

Supabase Edge Functions

No implementar todavía.

Solo dejar la arquitectura preparada.

BASE DE DATOS

Diseñar tablas escalables para:

Usuarios

Cursos

Módulos

Lecciones

Recursos

Categorías

Profesores

Progreso

Quizzes

Preguntas

Respuestas

Certificados

Comentarios

Favoritos

Historial

EXPERIENCIA DE USUARIO

Debe sentirse premium.

Animaciones suaves.

Carga muy rápida.

Excelente experiencia móvil.

Navegación intuitiva.

CONTENIDO

NO crear contenido del curso.

Únicamente crear:

La estructura

Las páginas

La navegación

La base de datos

Los componentes

Los layouts

El sistema de progreso

El panel de administración

El editor de cursos

Toda la plataforma debe quedar lista para que posteriormente podamos ir incorporando los contenidos del curso.

Una mejora que añadiría

Conociendo cómo trabajas y el tipo de proyectos que desarrollas, incluiría desde el principio una funcionalidad que muy pocas plataformas tienen: un "Laboratorio de IA".

No formaría parte del primer curso, pero la arquitectura debería dejar preparada una sección donde el alumno pueda interactuar directamente con herramientas de IA sin salir de la plataforma. En el futuro podría incluir:

Un comparador entre ChatGPT, Gemini, Claude y otros LLM.

Un generador de prompts con plantillas.

Un "playground" para probar prompts.

Un repositorio personal de prompts favoritos.

Un historial de conversaciones y ejercicios.

Diseñar esa arquitectura ahora evitará tener que rehacer gran parte de la plataforma cuando quieras convertir la academia en una referencia sobre IA.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7b439011-fd70-4e98-9ccc-b59d66ba1b7c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
