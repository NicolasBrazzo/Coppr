import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const kind = pgEnum("kind", ["expense", "income"]);

// uuidv7() è nativo da Postgres 18: non rivela quante righe esistono ed è ordinato nel tempo
const id = () => uuid("id").primaryKey().default(sql`uuidv7()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// --- Autenticazione: tabelle lette e scritte da Better Auth (server/src/auth.ts).
// Generate con `npx auth generate` e adattate alle convenzioni di questo file.
// I nomi delle proprietà devono restare quelli di Better Auth: l'adattatore Drizzle li usa per mappare i campi.

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    // Better Auth la salva già in minuscolo; il check lo garantisce anche per le scritture dirette
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // Campo aggiuntivo di Better Auth con input: false: lo imposta solo il server
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("users_email_lowercase", sql`${t.email} = lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    // Il valore che sta nel cookie (firmato con BETTER_AUTH_SECRET)
    token: text("token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

// Un account per metodo di accesso. Per email e password: provider_id = 'credential',
// account_id = id dell'utente, password = hash della password (mai la password in chiaro)
export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);

// Token temporanei: verifica email e recupero password
export const verifications = pgTable(
  "verifications",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

// --- Dati dell'app

export const categories = pgTable(
  "categories",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    kind: kind("kind").notNull(),
  },
  (t) => [
    unique("categories_user_id_name_key").on(t.userId, t.name),
    // Bersaglio delle foreign key composte di transactions e budgets
    unique("categories_id_user_id_kind_key").on(t.id, t.userId, t.kind),
    check("categories_name_length", sql`char_length(${t.name}) BETWEEN 1 AND 30`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    kind: kind("kind").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    // La categoria deve essere dello stesso utente e dello stesso kind.
    // NO ACTION (non RESTRICT): blocca l'eliminazione diretta di una categoria usata,
    // ma lascia passare la cascata quando si elimina l'utente
    foreignKey({
      name: "transactions_category_fk",
      columns: [t.categoryId, t.userId, t.kind],
      foreignColumns: [categories.id, categories.userId, categories.kind],
    }),
    // Lista mensile, dashboard e paginazione a cursore su (occurred_on, id)
    index("transactions_user_id_occurred_on_id_idx").on(t.userId, t.occurredOn.desc(), t.id.desc()),
    check("transactions_amount_cents_positive", sql`${t.amountCents} > 0`),
    check("transactions_note_length", sql`char_length(${t.note}) <= 200`),
  ],
);

// Un budget per categoria, valido ogni mese finché non viene cambiato
export const budgets = pgTable(
  "budgets",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().unique(),
    // Sempre 'expense': esiste solo per far rifiutare dalla foreign key le categorie di entrata
    kind: kind("kind").notNull().default("expense"),
    limitCents: integer("limit_cents").notNull(),
  },
  (t) => [
    foreignKey({
      name: "budgets_category_fk",
      columns: [t.categoryId, t.userId, t.kind],
      foreignColumns: [categories.id, categories.userId, categories.kind],
    }),
    check("budgets_kind_expense", sql`${t.kind} = 'expense'`),
    check("budgets_limit_cents_positive", sql`${t.limitCents} > 0`),
  ],
);
