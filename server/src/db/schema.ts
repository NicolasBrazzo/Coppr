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

// --- Autenticazione (docs/auth/SPEC.md): tabelle nostre, nessuna libreria di autenticazione

export const users = pgTable(
  "users",
  {
    id: id(),
    // Facoltativo: si imposta dopo la registrazione. Finché manca, l'interfaccia mostra l'email
    name: text("name"),
    // Il check lo garantisce anche per le scritture dirette: l'email si salva sempre in minuscolo
    email: text("email").notNull().unique(),
    // Formato scrypt$N$r$p$sale$hash (server/src/auth/password.ts). Null solo per l'utente demo
    passwordHash: text("password_hash"),
    // Impostato solo dal server, mai dal client
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("users_password_required", sql`${t.isDemo} OR ${t.passwordHash} IS NOT NULL`),
    check("users_name_length", sql`${t.name} IS NULL OR char_length(${t.name}) BETWEEN 1 AND 50`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 esadecimale del token che sta nel cookie (server/src/auth/session.ts), mai il token
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  // Per chiudere in un colpo tutte le sessioni di un utente
  (t) => [index("sessions_user_id_idx").on(t.userId)],
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
