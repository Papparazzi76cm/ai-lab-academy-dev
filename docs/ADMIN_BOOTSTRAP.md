# Alta manual del primer administrador

Por seguridad, **ningún usuario se convierte en administrador automáticamente**
(tampoco el primero que se registra). El rol `admin` solo puede asignarlo el
propietario del proyecto ejecutando SQL en el backend.

## Cómo se crean perfil y rol inicial

- **Vía principal:** un trigger sobre `auth.users` ejecuta `handle_new_user()`
  al registrarse, creando el perfil (con `full_name` de los metadatos) y el rol
  `student`.
- **Respaldo:** la aplicación llama una sola vez por sesión a la función
  `public.bootstrap_current_user()`. Es `security definer`, no acepta
  parámetros, actúa exclusivamente sobre `auth.uid()` y solo pueden ejecutarla
  usuarios autenticados. Si el perfil o el rol ya existen, no duplica nada.

Ninguna de las dos vías puede asignar roles distintos de `student`.

## Pasos para asignar `admin`

1. Regístrate normalmente en la aplicación con el email que será administrador.
   El alta crea el perfil y el rol `student`.
2. Localiza el `user_id`:

```sql
select id, email from auth.users where email = 'tu-email@ejemplo.com';
```

3. Asigna el rol `admin` con ese identificador:

```sql
insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'admin')
on conflict (user_id, role) do nothing;
```

4. Cierra sesión y vuelve a entrar para que la aplicación recargue los roles.

## Instructores

Mismo procedimiento cambiando `'admin'` por `'instructor'`.

## Reglas

- Nunca uses la service role key en el cliente ni la compartas; tampoco hace
  falta para estos pasos.
- Las políticas RLS impiden que un usuario se asigne roles a sí mismo: solo un
  administrador existente (o este SQL manual) puede crear roles.
