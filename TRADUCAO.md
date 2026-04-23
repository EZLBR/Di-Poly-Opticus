# Sistema de Tradução Opticus

## Como usar

### Para os usuários:
1. Clique no seletor de idioma na navbar (canto superior direito)
2. Selecione entre **English** e **Português**
3. A página será traduzida automaticamente
4. A preferência de idioma é salva no navegador

### Para os desenvolvedores:

#### Adicionando tradução a um novo elemento:

1. **Adicione o atributo `data-i18n`** ao elemento HTML:
```html
<h1 data-i18n="minha-chave-de-traducao">English text here</h1>
```

2. **Adicione a tradução** no arquivo `translations.js`:
```javascript
const translations = {
  en: {
    "minha-chave-de-traducao": "English text here",
    // ...
  },
  pt: {
    "minha-chave-de-traducao": "Texto em português aqui",
    // ...
  }
};
```

#### Tipos de elementos suportados:

- **Texto normal**: `<span data-i18n="key">Text</span>`
- **Títulos**: `<h1 data-i18n="key">Title</h1>`
- **Placeholders**: `<input data-i18n-placeholder="key" />`
- **Labels de botões**: `<button data-i18n="key">Button</button>`
- **Atributos aria-label**: `<div data-i18n-label="key">Content</div>`

#### Traduzir dinamicamente via JavaScript:

```javascript
// Obter tradução
const texto = t("minha-chave");

// Mudar idioma
setLanguage("pt"); // ou "en"

// Obter idioma atual
const idioma = getCurrentLanguage();

// Ouvir mudanças de idioma
window.addEventListener("languageChanged", (e) => {
  console.log("Novo idioma:", e.detail.lang);
});
```

## Arquivos envolvidos:

- **translations.js** - Dicionário de traduções
- **main.js** - Funções para gerenciar o idioma
- **style.css** - Estilos do seletor de idioma
- **[páginas HTML]** - Elementos com atributos `data-i18n`

## Idiomas suportados:

- **en** - English
- **pt** - Português (Brasil)

## Armazenamento:

As preferências de idioma são salvas em `localStorage` com a chave `opticus_language`.

## Exemplo completo:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <select id="languageSelector">
      <option value="en">English</option>
      <option value="pt">Português</option>
    </select>
  </header>
  
  <h1 data-i18n="titulo-principal">Welcome</h1>
  <p data-i18n="descricao">This is a description</p>
  
  <script src="translations.js"></script>
  <script src="main.js"></script>
</body>
</html>
```
