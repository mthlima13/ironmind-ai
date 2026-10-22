-- Ajustes globais do banco IronMind AI.
-- Executado uma unica vez, na criacao do container do Postgres.
-- Este arquivo roda dentro do psql, entao pode usar \gexec.

-- Integridade referencial em toda a base: o padrao do Postgres ja e ON DELETE
-- RESTRICT, que e o comportamento desejado para dados historicos.

-- Fuso horario do armazenamento em UTC. O app converte para o timezone do
-- usuario (users.timezone) na apresentacao.
SELECT format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC') \gexec

-- Mensagens de erro em ingles e sem dependencia de locale: evita divergencia
-- entre ambientes e simplifies a leitura de logs.
ALTER DATABASE :"DBNAME" SET lc_messages TO 'C';
