# Deploy: Supabase + Vercel

Passo a passo para colocar o Gestão Izi no ar. Ordem recomendada: **Supabase → Vercel → domínio → primeiro acesso**.

## 1. Supabase (banco e autenticação)

### 1.1 Criar o projeto
1. Em [supabase.com/dashboard](https://supabase.com/dashboard) crie um projeto (região próxima dos clientes; para o Brasil, `South America (São Paulo)`).
2. Guarde a senha do banco num gerenciador de senhas.

### 1.2 Rodar as migrations (nesta ordem)
Opção A, pelo painel: **SQL Editor → New query**, cole o arquivo e clique em **Run**, um de cada vez:

1. `supabase/migrations/20261023000000_init_schema.sql`
2. `supabase/migrations/20261023010000_sync_app_metadata_to_profiles.sql`
3. `supabase/migrations/20261024000000_add_manager_role.sql`: **rode sozinha, numa execução à parte**
4. `supabase/migrations/20261024010000_manager_policies.sql`: só depois da 3 (o Postgres não deixa usar o novo valor do enum na mesma transação em que ele nasce)

Opção B, pela CLI (recomendada para novos ambientes, pois registra o histórico):

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

O `ref` é o trecho `xxxx` de `https://xxxx.supabase.co`. Novas migrations entram sempre como arquivos novos em `supabase/migrations/`; nunca edite uma já aplicada.

### 1.3 Configurar Auth
Em **Authentication**:
- **Sign In / Providers → Email**: mantenha habilitado e **desligue "Allow new users to sign up"** (as contas são criadas pelo master/proprietário).
- **URL Configuration**: `Site URL` = URL final do app (ex.: `https://app.seudominio.com.br`). Adicione também a URL de preview da Vercel em `Redirect URLs` se for usá-la.

### 1.4 Chaves
Em **Project Settings → API** (ou *API Keys*) copie:

| Variável | Onde achar | Pode ir ao navegador? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL: só `https://xxxx.supabase.co`, **sem** `/rest/v1/` | sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave `anon` / *publishable* | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` / *secret* | **não, nunca** |

A `service_role` ignora o RLS. Ela só é usada no servidor (criação de lojas, proprietários e vendedores). Nunca use o prefixo `NEXT_PUBLIC_` nela, nunca a commite e troque-a (Rotate) se vazar.

### 1.5 Criar o usuário Master
1. **Authentication → Users → Add user → Create new user** (e-mail + senha, marcando *Auto Confirm User*).
2. No **SQL Editor**:
   ```sql
   update public.profiles set role = 'master' where email = 'voce@dominio.com';
   ```
3. Faça login no app; você deve cair em `/master/stores`.

## 2. Vercel (hospedagem)

### 2.1 Importar o repositório
1. Suba o código para o GitHub/GitLab/Bitbucket (`git remote add origin ... && git push -u origin main`).
2. Na Vercel: **Add New → Project → Import** o repositório. O framework **Next.js** é detectado sozinho; deixe os comandos padrão (`next build`).
3. Em **Environment Variables**, cadastre as três variáveis da tabela acima para **Production** (e **Preview**, se quiser branches de teste, de preferência apontando para um projeto Supabase separado).
4. **Deploy**.

Alterou uma variável? É preciso um novo deploy (**Deployments → ⋯ → Redeploy**) para ela valer.

### 2.2 Domínio personalizado
1. **Project → Settings → Domains → Add** e informe o domínio (ex.: `app.seudominio.com.br`).
2. A Vercel mostra os registros DNS exatos a criar no seu provedor (Registro.br, Cloudflare, GoDaddy…). Use sempre os valores exibidos na tela. Em geral:

   | Tipo | Nome/Host | Valor |
   |---|---|---|
   | `CNAME` | `app` (subdomínio) | valor mostrado na Vercel (ex.: `cname.vercel-dns.com`) |
   | `A` | `@` (domínio raiz) | valor mostrado na Vercel (ex.: `76.76.21.21`) |

   Para domínio raiz, o `www` costuma ser um `CNAME` e a Vercel redireciona um para o outro.
3. No Cloudflare, deixe o registro como **DNS only** (nuvem cinza) até a Vercel validar.
4. A propagação leva de minutos a algumas horas. Quando o status ficar **Valid Configuration**, o certificado HTTPS é emitido automaticamente.
5. Volte ao Supabase (**Authentication → URL Configuration**) e atualize o `Site URL` para o domínio final.

> **HTTPS é obrigatório** para a câmera: navegadores só liberam a leitura de QR/código de barras em `https://` ou `localhost`.

## 3. Checklist pós-deploy

- [ ] `/login` abre e o master entra.
- [ ] Master cria uma loja de teste com proprietário (`/master/stores`).
- [ ] Proprietário entra, cria categoria, produto com variante e estoque, e um vendedor.
- [ ] Vendedor abre o caixa, vende (por busca e pela câmera no celular) e o estoque baixa.
- [ ] Painel do proprietário (`/owner`) mostra a venda; cancelar a venda devolve o estoque.
- [ ] Etiquetas (`/owner/labels`): prévia aparece, imprimir gera páginas do tamanho certo.
- [ ] Cadastro público desligado (tentar criar conta direto na API retorna erro).

Para validar o RLS de ponta a ponta contra o ambiente (cria lojas descartáveis e apaga tudo no final), localmente com o `.env.local` apontando para o projeto:

```bash
npm run test:rls
```

## 4. Operação e segurança

- **Backups**: ative *Point-in-Time Recovery* (plano Pro) ou agende `pg_dump`. No plano gratuito há apenas backups diários limitados.
- **Fuso horário**: o painel calcula "hoje" e "mês" em Brasília (UTC-3).
- **Desativar usuário**: bloqueia o acesso apenas no próximo refresh do token (até 1 h para sessões abertas).
- **Domínios de e-mail/SMTP**: o SMTP padrão do Supabase tem limite baixo; para recuperação de senha em produção configure um SMTP próprio em *Authentication → SMTP Settings*.
- **Atualizações do schema**: crie um arquivo novo em `supabase/migrations/`, teste num projeto de homologação e aplique com `supabase db push`.
