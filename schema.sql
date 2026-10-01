-- ponytail: params guardados como texto (no FK); renombrar un param no actualiza registros viejos.
create table if not exists params (
  id serial primary key,
  kind text not null, -- gasto_tipo | gasto_nombre | producto_tipo | producto_nombre | metodo_pago | vendedor
  value text not null,
  unique (kind, value)
);

create table if not exists gastos (
  id serial primary key,
  tipo text not null,
  nombre text not null,
  unidades numeric not null check (unidades > 0),
  fecha date not null,
  monto numeric not null check (monto >= 0),
  monto_unitario numeric generated always as (monto / unidades) stored
);

-- tipo/nombre de un ingreso = tipo/nombre de un producto
create table if not exists ingresos (
  id serial primary key,
  tipo text not null,
  nombre text not null,
  unidades numeric not null default 1 check (unidades > 0),
  monto numeric not null check (monto >= 0),
  fecha date not null,
  metodo_pago text not null,
  vendedor text not null,
  comision numeric not null default 0
);

create table if not exists productos (
  id serial primary key,
  tipo text not null,
  nombre text not null,
  unique (tipo, nombre)
);

-- cada componente: cuántas unidades de un gasto (tipo+nombre) lleva 1 producto
create table if not exists producto_items (
  id serial primary key,
  producto_id int not null references productos on delete cascade,
  gasto_tipo text not null,
  gasto_nombre text not null,
  cantidad numeric not null check (cantidad > 0)
);

-- costo unitario promedio ponderado de cada insumo: total gastado / total unidades
create or replace view costo_insumo as
  select tipo, nombre, sum(unidades) unidades, sum(monto) monto, sum(monto) / sum(unidades) costo
  from gastos group by tipo, nombre;

-- ponytail: insumo sin gastos cargados cuenta como costo 0; se marca en /productos
create or replace view costo_producto as
  select p.id, p.tipo, p.nombre, coalesce(sum(i.cantidad * c.costo), 0) costo
  from productos p
  left join producto_items i on i.producto_id = p.id
  left join costo_insumo c on c.tipo = i.gasto_tipo and c.nombre = i.gasto_nombre
  group by p.id;

create or replace view ingresos_ganancia as
  select i.*, coalesce(cp.costo, 0) * i.unidades costo,
         i.monto - i.comision - coalesce(cp.costo, 0) * i.unidades ganancia,
         cp.id is null sin_producto
  from ingresos i left join costo_producto cp on cp.tipo = i.tipo and cp.nombre = i.nombre;

-- stock: cada fila es una unidad armada de un producto; codigo opcional (ej. NFC).
-- stock disponible = unidades armadas − unidades vendidas (ingresos del mismo tipo+nombre).
create table if not exists unidades (
  id serial primary key,
  producto_id int not null references productos on delete cascade,
  codigo text unique,
  fecha date not null default current_date,
  ingreso_id int references ingresos on delete set null -- venta a la que se asignó este código
);
