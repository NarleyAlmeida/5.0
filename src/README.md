# Estrutura do Projeto

Este diretório contém a estrutura modular do projeto TRIARIO.

## Organização

```
src/
├── config/          # Configurações e constantes
│   ├── constants.ts      # Constantes do sistema
│   ├── env.ts            # Variáveis de ambiente
│   ├── firebase.ts       # Configuração Firebase
│   └── validate-env.ts    # Validação de ambiente
├── types/            # Definições TypeScript
│   └── index.ts          # Todos os tipos
├── utils/            # Utilitários
│   ├── calculations.ts  # Lógica de cálculos (tempestividade, outputs)
│   ├── currency.ts       # Formatação de moeda
│   ├── date.ts          # Manipulação de datas
│   ├── storage.ts        # Gerenciamento de localStorage
│   ├── string.ts         # Utilitários de string
│   ├── theme.ts          # Gerenciamento de tema
│   └── index.ts          # Re-exports
├── hooks/            # React hooks customizados (a criar)
├── components/       # Componentes React (a criar)
└── README.md         # Este arquivo
```

## Uso

### Importar tipos
```typescript
import type { TriagemState, UserProfile, Outputs } from '@/src/types';
```

### Importar utilitários
```typescript
import { formatDate, formatCurrency, computeTempestividade } from '@/src/utils';
```

### Importar configuração
```typescript
import { getFirebase, getEnvConfig } from '@/src/config';
```

## Benefícios da Modularização

1. **Manutenibilidade**: Código organizado e fácil de encontrar
2. **Reutilização**: Utilitários podem ser usados em múltiplos lugares
3. **Testabilidade**: Módulos isolados são mais fáceis de testar
4. **Escalabilidade**: Fácil adicionar novas funcionalidades
5. **Type Safety**: Tipos centralizados garantem consistência

## Próximos Passos

- [ ] Extrair hooks customizados (useAuth, useTriage, useStorage)
- [ ] Extrair componentes UI reutilizáveis
- [ ] Extrair componentes de formulário
- [ ] Adicionar testes unitários
- [ ] Documentar APIs públicas
