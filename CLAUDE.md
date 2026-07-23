# Tatamiq — instruções do projeto

## Ícones (apps/web)

Este projeto usa **`hugeicons-react`** como biblioteca de ícones. **Não use `lucide-react`**
em código de feature ou em componentes de UI.

Componentes adicionados via CLI do shadcn/reui (`npx shadcn add ...`) vêm com imports de
`lucide-react` embutidos e **não** respeitam o campo `iconLibrary` do `components.json`.
Portanto, **após instalar qualquer componente shadcn/reui, troque os ícones lucide pelos
equivalentes do hugeicons** (import + identificador JSX). As props usadas (`className`,
`aria-hidden`, etc.) são compatíveis — basta trocar o nome.

Mapeamento de referência (lucide → hugeicons):

| lucide              | hugeicons          |
| ------------------- | ------------------ |
| `CalendarIcon`      | `Calendar03Icon`   |
| `PlusIcon`          | `PlusSignIcon`     |
| `ChevronLeftIcon`   | `ArrowLeft01Icon`  |
| `ChevronRightIcon`  | `ArrowRight01Icon` |
| `ChevronDownIcon`   | `ArrowDown01Icon`  |
| `RepeatIcon`        | `RepeatIcon`       |

Para ícones não listados, procure o nome equivalente em `hugeicons-react` (a maioria segue
o padrão `NomeNNIcon`). Depois da troca, confirme que não restou nenhum import de
`lucide-react`: `grep -rn "lucide-react" apps/web/src`.
