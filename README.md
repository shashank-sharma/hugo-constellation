# Hugo Constellation Theme

An interactive markdown graph theme to showcase personal portfolios in a visually engaging way. It's just a side project, and have limited functionality

![graph view of hugo-constellation](https://github.com/shashank-sharma/hugo-constellation/blob/master/images/main.png?raw=true)

## Features

- Interactive markdown graph visualization
- Physics-based node movement with draggable nodes
- Customizable node shapes, colors, and connections
- Responsive design for both desktop and mobile (Highly Experimental)
- Smooth animations and transitions

## Installation

1. Create a new Hugo site or navigate to your existing Hugo site
   ```bash
   hugo new site my-portfolio
   cd my-portfolio
   ```

2. Clone this repository into the themes directory
   ```bash
   git clone https://github.com/shashank-sharma/hugo-constellation themes/hugo-constellation
   ```

3. Set the theme in your config.toml file
   ```toml
   theme = "hugo-constellation"
   ```

## Configuration

### Site Configuration

Ensure your `config.toml` includes the necessary output formats to generate JSON files:

```toml
[outputs]
  home = ["HTML", "JSON"]
  section = ["HTML", "JSON"]
  page = ["HTML", "JSON"]
  
[outputFormats.JSON]
  mediaType = "application/json"
  isPlainText = true
  notAlternative = true
```

## Adding Content

Create a directory for your node content:

```bash
mkdir -p content/nodes
```

### Manual Content Creation

For each node in your graph, create a Markdown file in the `content/nodes` directory:

```markdown
---
title: "Node Title"
type: "nodes"
id: "person"     # id and filename must be same to work correctly
shape: "square"  # circle, triangle, square etc
parent: "parentid"  # Required for nodes which needs to connect with parent
subtitle: "Node Subtitle"
weight: 10
draft: false
connectionLabel: "random label" # Optional when trying to connect
connectionType: "solid"         # dashed or solid
---

## Your Content Heading

This is the detailed content for this node. It will be displayed in the sidebar when the node is selected.

You can include:
- Lists
- **Bold text**
- *Italic text*
- [Links](https://example.com)
- And other Markdown features
- ![Image](/images/hello.png)
```

Note: Person node, which is person.md must be there to act as a center of this graph. Follow nodes can be dynamic as per your needs



## Available Node Shapes

- `circle`: Circular nodes
- `square`: Square nodes
- `triangle`: Triangular nodes
- `pentagon`: Pentagon nodes
- `diamond`: Diamond-shaped nodes
- `hexagon`: Hexagonal nodes
- `octagon`: Octagon nodes

## Connection Types

- `solid`: Solid line connection
- `dotted`: Dotted line connection

## Screenshot

![screenshot of hugo-constellation](https://github.com/shashank-sharma/hugo-constellation/blob/master/images/screenshot.png?raw=true)

![mobile screenshot of hugo-constellation](https://github.com/shashank-sharma/hugo-constellation/blob/master/images/mobile.png?raw=true)

## Customization

TODO

## License

This theme is licensed under the MIT License - see the LICENSE file for details.
