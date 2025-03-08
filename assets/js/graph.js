/**
 * Graph Visualization System
 *
 * A modular, object-oriented implementation of an interactive graph visualization
 * that displays nodes and their connections with physics-based positioning.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize global variables for image modal
    let imageModal;
    let modalImage;
    let imageCaption;

    // Main Graph Visualization class to handle the overall application
    class GraphVisualization {
        constructor() {
            this.initializeElements();
            this.initializeState();
            this.setupConfig();
            this.createUIElements();
            this.fetchGraphData();
        }

        // Initialize DOM elements
        initializeElements() {
            this.canvas = document.getElementById('graphCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.loadingEl = document.getElementById('loading');
            this.debugPanel = document.getElementById('debugPanel');
            this.debugTransition = document.getElementById('debugTransition');
            this.debugQueue = document.getElementById('debugQueue');
            this.graphContainer = this.canvas.parentElement;
        }

        // Initialize application state
        initializeState() {
            this.width = 0;
            this.height = 0;
            this.nodes = [];
            this.links = [];
            this.selectedNode = null;
            this.hoveredNode = null;
            this.draggedNode = null;
            this.lastMouseX = 0;
            this.lastMouseY = 0;
            this.pixelRatio = window.devicePixelRatio || 1;
            this.animationFrame = null;
            this.lastTime = Date.now();
            this.dragDistance = 0;
            this.nodeContentMap = {};
            this.visibilityMap = {};
            this.settlementMap = {};
            this.nodeVelocities = {};
            this.nodeQueue = [];
            this.transitionState = null;
            this.transitionStartTime = null;
            this.isTransitioning = false;
            this.nodeProcessingTimer = null;
            this.debugMode = window.location.search.includes('debug=true');
            this.zoomedOut = false;
            this.initialCenterNode = null; // Store node specified in URL
            this.isDragging = false;
            this.visibilityNodeQueue = [];
            this.processingQueue = false;
            this.isPanning = false;
            this.lastPanX = 0;
            this.lastPanY = 0;
            this.sizeMultiplier = 1;
        }

        // Set up configuration parameters
        setupConfig() {
            // Determine if we're on mobile
            const isMobile = this.isMobileDevice();

            this.config = {
                // UI settings
                centerOffsetX: isMobile ? 0 : -300, // No offset on mobile to keep graph centered
                rightCardMargin: 40,
                nodeRadius: 8,
                arrowSize: 15,

                // Physics settings
                linkDistance: 80,
                charge: -400,
                springLength: 110,        // Distance between nodes
                springStrength: 0.03,     // Strength of spring force
                repulsionStrength: 13000,  // Strength of repulsion force
                centeringStrength: 0.003, // Strength of centering force
                dampingFactor: 0.1,       // Damping factor for motion

                // Node positioning
                firstLevelRadius: 120,    // Distance of first-level connections from center node
                secondLevelRadius: 170,   // Distance of second-level connections
                outerLevelRadius: 300,    // Distance of unconnected nodes
                initialRadius: 150,       // Initial radius for non-person nodes
                randomPositionOffset: 50, // Random position variance for initial node placement
                personOffsetX: isMobile ? 40 : 80,  // Reduced offset on mobile
                personOffsetY: isMobile ? 25 : 50,  // Reduced offset on mobile

                // Node movement speeds - reduced for smoother animations
                centerNodeVelocity: 0.015, // Center node movement speed (slower for smoothness)
                firstLevelVelocity: 0.015, // First level node movement speed (slower for smoothness)
                secondLevelVelocity: 0.04, // Second level node movement speed (slower for smoothness)
                outerNodeVelocity: 0.025,  // Outer node movement speed (slower for smoothness)

                // Animation timing
                nodeProcessingInterval: 500, // Time between showing each node (ms)
                fadeSpeed: 0.02,             // Node fade in/out speed (0-1)
                transitionDelay: 600,        // Delay between transition stages (ms)
                settlementThreshold: 0.1,    // Velocity at which nodes are considered settled
                settlementFramesRequired: 5, // Number of frames node must be settled
                initialNodeDelay: 700,       // Initial delay before showing first-level nodes (ms)
                maxCardHeight: 60,           // Maximum height as percentage of viewport height

                // Grid settings
                gridSize: 30,                // Size of grid cells in pixels
                gridOpacity: 0.08,           // Opacity of grid lines
                gridLineWidth: 0.5,          // Width of grid lines
            };

            // Set CSS variables for configurable values
            document.documentElement.style.setProperty('--right-card-margin', `${this.config.rightCardMargin}px`);
            document.documentElement.style.setProperty('--center-offset-x', `${this.config.centerOffsetX}px`);

            if (this.isMobileDevice()) {
                this.sizeMultiplier = 0.75;
            }
        }

        // Create UI elements
        createUIElements() {
            this.createRightCard();
            this.createZoomToggleButton();
        }

        // Create the right card container and content
        createRightCard() {
            this.rightCardContainer = document.createElement('div');
            this.rightCardContainer.id = 'rightCardContainer';
            this.rightCardContainer.classList.add('right-card-container');
            this.graphContainer.appendChild(this.rightCardContainer);

            this.rightCard = document.createElement('div');
            this.rightCard.id = 'rightCard';
            this.rightCardContainer.appendChild(this.rightCard);

            // Add mobile close button
            this.mobileCloseBtn = document.createElement('button');
            this.mobileCloseBtn.id = 'mobileCloseBtn';
            this.mobileCloseBtn.innerHTML = '<i class="fas fa-times"></i>';
            this.mobileCloseBtn.title = "Close";
            this.mobileCloseBtn.style.display = this.isMobileDevice() ? 'flex' : 'none';
            this.rightCard.appendChild(this.mobileCloseBtn);

            this.cardContentEl = document.createElement('div');
            this.cardContentEl.id = 'cardContent';
            this.cardContentEl.classList.add('card-content');
            this.rightCard.appendChild(this.cardContentEl);

            this.defaultContentEl = document.createElement('div');
            this.defaultContentEl.id = 'defaultContent';
            this.defaultContentEl.classList.add('default-content');
            this.defaultContentEl.innerHTML = 'Select a node to view details';
            this.cardContentEl.appendChild(this.defaultContentEl);

            this.nodeContentEl = document.createElement('div');
            this.nodeContentEl.id = 'nodeContent';
            this.nodeContentEl.classList.add('node-content');
            this.nodeContentEl.style.display = 'none';
            this.cardContentEl.appendChild(this.nodeContentEl);
        }

        // Create the zoom toggle button
        createZoomToggleButton() {
            this.zoomToggleBtn = document.createElement('button');
            this.zoomToggleBtn.id = 'zoomToggleBtn';
            this.zoomToggleBtn.innerHTML = '<i class="fas fa-minus"></i>';
            this.zoomToggleBtn.title = "Show all nodes";
            this.zoomToggleBtn.classList.add('zoom-toggle-btn');
            this.graphContainer.appendChild(this.zoomToggleBtn);
        }

        // Fetch graph data from server
        fetchGraphData() {
            fetch('/data/graph.json')
                .then(response => response.json())
                .then(data => {
                    this.graphData = data;
                    this.processGraphData();
                    this.initGraph();
                })
                .catch(error => {
                    console.error('Error loading graph data:', error);
                    if (this.loadingEl) {
                        this.loadingEl.textContent = 'Error loading graph data. Please check the console.';
            }
        });
    }

        // Process the fetched graph data
        processGraphData() {
            const centerX = this.width / 2 + this.config.centerOffsetX;
            const centerY = this.height / 2;

            // Create center node
            const centerNode = {
                ...this.graphData.center,
                x: centerX,
                y: centerY,
                radius: (this.graphData.visualSettings?.nodeSize?.person || this.config.nodeRadius) * this.sizeMultiplier,
                color: this.graphData.visualSettings?.colors?.person || "#4299e1",
                mass: 3,
                vx: 0,
                vy: 0
            };

            // Initialize nodeContentMap with descriptions from graph.json
            this.nodeContentMap[centerNode.id] = {
                id: centerNode.id,
                name: centerNode.name,
                content: this.formatDescriptionWithImages(centerNode.description || '')
            };

            this.nodes.push(centerNode);

            // Process all other nodes
            this.graphData.nodes.forEach(nodeData => {
                const node = {
                    ...nodeData,
                    x: centerX + (Math.random() - 0.5) * 100,
                    y: centerY + (Math.random() - 0.5) * 100,
                    radius: (this.graphData.visualSettings?.nodeSize?.default || this.config.nodeRadius) * this.sizeMultiplier,
                    color: this.graphData.visualSettings?.colors?.[nodeData.shape] ||
                           this.graphData.visualSettings?.colors?.default || "#ed8936",
                    mass: 1,
                    vx: 0,
                    vy: 0
                };

                // Initialize nodeContentMap
                this.nodeContentMap[node.id] = {
                    id: node.id,
                    name: node.name,
                    content: this.formatDescriptionWithImages(node.description || '')
                };

                this.nodes.push(node);
            });

            // Process connections
            this.graphData.connections.forEach(conn => {
                const source = this.nodes.find(n => n.id === conn.source);
                const target = this.nodes.find(n => n.id === conn.target);

                if (source && target) {
                    const link = {
                        source,
                        target,
                        value: parseInt(conn.value) || 1,
                        type: conn.type || '',
                        label: conn.label || ''
                    };

                    this.links.push(link);
                }
            });
        }

        // Helper function to format description text and handle markdown images
        formatDescriptionWithImages(description) {
            if (!description) return '<p>No description available</p>';

            // Convert markdown image syntax to HTML <img> tags
            const formattedText = description.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

            // Split by double newlines to create paragraphs
            const paragraphs = formattedText.split(/\n\n+/);

            // Wrap each paragraph in <p> tags, except for HTML that already has tags
            const htmlContent = paragraphs.map(para => {
                // Skip wrapping if it already looks like HTML
                if (para.trim().startsWith('<') && para.trim().endsWith('>')) {
                    return para;
                }
                // Replace single newlines with <br>
                return `<p>${para.replace(/\n/g, '<br>')}</p>`;
            }).join('');

            return htmlContent;
        }

        // Initialize the graph
        initGraph() {
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());

            const centerX = this.width / 2 + this.config.centerOffsetX;
            const centerY = this.height / 2;

            // Position the person node at the center
            const personNode = this.nodes.find(node => node.type === 'person');
            personNode.x = centerX;
            personNode.y = centerY;

            // Position other nodes in a circle
            const nonPersonNodes = this.nodes.filter(node => node.type !== 'person');
            nonPersonNodes.forEach((node, i) => {
                const angle = (2 * Math.PI * i) / nonPersonNodes.length;
                const radius = this.config.initialRadius;
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
            });

            // Initialize maps for tracking node state
            this.nodes.forEach(node => {
                this.visibilityMap[node.id] = 0;
                this.settlementMap[node.id] = 0;
                this.nodeVelocities[node.id] = [];
            });

            this.initializeRightCardWithAllSections();
            this.setupEventListeners();

            // Check if we need to select a node based on URL
            this.handleUrlNavigation();

            // Check if we should hide the sidebar on mobile
            if (this.isMobileDevice() && !this.selectedNode) {
                this.rightCardContainer.classList.remove('active');
            } else if (this.selectedNode) {
                this.rightCardContainer.classList.add('active');
            }

            this.beginStagedTransition();
            if (this.debugMode) {
                this.debugPanel.style.display = 'block';
            }

            this.animate();
        }

        // Initialize the right card with sections for all nodes
        initializeRightCardWithAllSections() {
            this.nodeContentEl.style.display = 'block';
            this.defaultContentEl.style.display = 'none';

        let htmlContent = '';
            const personNode = this.nodes.find(node => node.type === 'person');

        if (personNode) {
                const nodeContent = this.nodeContentMap[personNode.id] || { content: 'Loading content...' };
            const description = personNode.description || '';

                htmlContent += this.createNodeSection(personNode, description, nodeContent, false);
            }

            this.nodeContentEl.innerHTML = htmlContent;
            this.addSectionClickHandlers();
            this.adjustRightCardHeight();
        }

        // Helper function to create HTML for a node section
        createNodeSection(node, description, nodeContent, collapsed = true) {
            return `
                <div class="content-section" id="node-section-${node.id}">
                    <div class="content-header${collapsed ? ' collapsed' : ''}" id="header-${node.id}">
                        <h3><i class="fas fa-chevron-down fa-xs"></i> ${node.name}</h3>
                    </div>
                    <div class="content-body${collapsed ? ' collapsed' : ''}" id="body-${node.id}">
                        <div class="section-content">
                            <div class="node-detail-content">
                                ${nodeContent.content}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Add click event handlers for all sections in the right card
        addSectionClickHandlers() {
            this.nodeContentEl.querySelectorAll('.content-header').forEach(header => {
            const nodeId = header.id.replace('header-', '');
            const bodyEl = document.getElementById(`body-${nodeId}`);

                header.addEventListener('click', () => {
                bodyEl.classList.toggle('collapsed');
                header.classList.toggle('collapsed');

                    // If opening a section
                if (!header.classList.contains('collapsed')) {
                        // Scroll the section into view
                        const sectionEl = document.getElementById(`node-section-${nodeId}`);
                        if (sectionEl) {
                            // Scroll the card content container to show the section at the top
                            setTimeout(() => {
                                this.cardContentEl.scrollTo({
                                    top: sectionEl.offsetTop,
                                    behavior: 'smooth'
                                });
                            }, 50); // Short delay to ensure DOM has updated after toggling
                        }

                        // Select that node in the graph
                        const targetNode = this.nodes.find(n => n.id === nodeId);
                    if (targetNode) {
                            // Select node will handle updating the URL
                            this.selectNode(targetNode);
                        } else {
                            // Edge case: If we can't find the node, still update the URL
                            const newUrl = `/nodes/${nodeId}`;
                            history.pushState({ nodeId }, header.textContent.trim(), newUrl);
                        }
                    }

                    // Adjust card height based on content
                    this.adjustRightCardHeight();
            });
        });
    }

    // Resize canvas to fill container
        resizeCanvas() {
            const container = this.canvas.parentElement;
            this.width = container.clientWidth;
            this.height = container.clientHeight;

            this.canvas.width = this.width * this.pixelRatio;
            this.canvas.height = this.height * this.pixelRatio;
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.ctx.scale(this.pixelRatio, this.pixelRatio);

            // Update centerOffsetX based on current screen size
            const wasMobile = this.config.centerOffsetX === 0;
            const isMobile = this.isMobileDevice();

            // Only update if mobile state has changed
            if (wasMobile !== isMobile) {
                this.config.centerOffsetX = isMobile ? 0 : -300;
                document.documentElement.style.setProperty('--center-offset-x', `${this.config.centerOffsetX}px`);

                // Update person node offset values
                this.config.personOffsetX = isMobile ? 40 : 80;
                this.config.personOffsetY = isMobile ? 25 : 50;

                // Reposition nodes if we have any
                if (this.nodes && this.nodes.length > 0) {
                    const centerX = this.width / 2 + this.config.centerOffsetX;
                    const centerY = this.height / 2;

                    // Update positions of all nodes
                    this.nodes.forEach(node => {
                        // Calculate new position relative to center
                        const dx = node.x - (this.width / 2 + (wasMobile ? 0 : -300));
                        const dy = node.y - this.height / 2;

                        // Apply new position with updated center
                        node.x = centerX + dx;
                        node.y = centerY + dy;
                    });

                    // If we have a selected node, recenter the view
                    if (this.selectedNode) {
                        this.centerOnNode(this.selectedNode);
                    }
                }
            }
        }

    // Apply forces to simulate physics
        applyForces(deltaTime) {
            const repulsionStrength = this.config.repulsionStrength;
            const springLength = this.config.springLength;
            const springStrength = this.config.springStrength;
            const centeringStrength = this.config.centeringStrength;
            const dampingFactor = this.config.dampingFactor;

        // Reset forces
            this.nodes.forEach(node => {
            node.fx = 0;
            node.fy = 0;
        });

        // Apply repulsion forces between nodes
            this.applyRepulsionForces(repulsionStrength);

            // Apply spring forces along links
            this.applySpringForces(springLength, springStrength);

            // Apply centering forces
            this.applyCenteringForces(centeringStrength);

            // Apply stronger centering force to selected node
            this.applySelectedNodeForces();

            // Update velocities and positions
            this.updateNodePositions(deltaTime, dampingFactor);
        }

        // Apply repulsion forces between nodes
        applyRepulsionForces(repulsionStrength) {
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const nodeA = this.nodes[i];
                    const nodeB = this.nodes[j];

                    if (this.visibilityMap[nodeA.id] <= 0.01 || this.visibilityMap[nodeB.id] <= 0.01) continue;

                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;

                if (distance > 300) continue;

                const force = repulsionStrength / (distance * distance);

                const nx = dx / distance;
                const ny = dy / distance;

                nodeA.fx -= nx * force;
                nodeA.fy -= ny * force;
                nodeB.fx += nx * force;
                nodeB.fy += ny * force;
                }
            }
        }

        // Apply spring forces along links
        applySpringForces(springLength, springStrength) {
            this.links.forEach(link => {
            const source = link.source;
            const target = link.target;

            // Skip invisible nodes
                if (this.visibilityMap[source.id] <= 0.01 || this.visibilityMap[target.id] <= 0.01) return;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            // Calculate spring force (proportional to difference from rest length)
            const displacement = distance - springLength;
            const force = springStrength * displacement;

            const nx = dx / distance;
            const ny = dy / distance;

            // Apply force to both nodes
            source.fx += nx * force;
            source.fy += ny * force;
            target.fx -= nx * force;
            target.fy -= ny * force;
        });
        }

        // Apply centering forces to all nodes
        applyCenteringForces(centeringStrength) {
            this.nodes.forEach(node => {
                if (this.visibilityMap[node.id] <= 0.01) return;

            // Apply offset to center position
                const centerX = this.width / 2 + this.config.centerOffsetX;
                const centerY = this.height / 2;

            const dx = centerX - node.x;
            const dy = centerY - node.y;
            node.fx += dx * centeringStrength;
            node.fy += dy * centeringStrength;
        });
        }

        // Apply stronger centering force to selected node
        applySelectedNodeForces() {
            if (this.selectedNode) {
            const strength = 0.05;
                const centerX = this.width / 2 + this.config.centerOffsetX;
                const centerY = this.height / 2;

                this.selectedNode.fx += (centerX - this.selectedNode.x) * strength;
                this.selectedNode.fy += (centerY - this.selectedNode.y) * strength;
            }
        }

        // Update node positions based on forces
        updateNodePositions(deltaTime, dampingFactor) {
            const settlementThreshold = this.config.settlementThreshold;

            this.nodes.forEach(node => {
                if (node === this.draggedNode) return;
                if (this.visibilityMap[node.id] <= 0.01) return;

                // Add slight floating motion
                const timeOffset = this.nodes.indexOf(node) * 0.5;
            const floatX = Math.sin((Date.now() / 8000) + timeOffset) * 0.05;
            const floatY = Math.cos((Date.now() / 8000) + timeOffset) * 0.05;
            node.fx += floatX;
            node.fy += floatY;

                // Update velocity based on forces
            node.vx = node.vx * dampingFactor + node.fx * deltaTime / node.mass;
            node.vy = node.vy * dampingFactor + node.fy * deltaTime / node.mass;

                // Additional damping for slow-moving nodes
            if (Math.sqrt(node.vx * node.vx + node.vy * node.vy) < settlementThreshold * 2) {
                node.vx *= 0.9;
                node.vy *= 0.9;
            }

                // Update position based on velocity
            node.x += node.vx;
            node.y += node.vy;

                // Keep nodes within canvas bounds
            const margin = node.radius + 20;
                node.x = Math.max(margin, Math.min(this.width - margin, node.x));
                node.y = Math.max(margin, Math.min(this.height - margin, node.y));
        });
    }

    // Function to draw nodes
        drawNode(node) {
            this.ctx.save();

        const x = node.x;
        const y = node.y;
        const size = node.radius;

            const visibility = this.visibilityMap[node.id] !== undefined ? this.visibilityMap[node.id] : 0;

        if (visibility <= 0.01) {
                this.ctx.restore();
            return;
        }

            this.ctx.globalAlpha = visibility;
        const color = node.color || "#ed8936";
            const computedStyle = getComputedStyle(document.body);
            if ((this.selectedNode && node.id === this.selectedNode.id) ||
                (this.hoveredNode && node.id === this.hoveredNode.id)) {
                const shadowColor = computedStyle.getPropertyValue('--text-color').trim() || 'white';
                this.ctx.shadowColor = shadowColor;
                this.ctx.shadowBlur = 1;
            }

            this.ctx.fillStyle = color;
            this.ctx.strokeStyle = this.isDarkTheme() ? 'white' : 'black';
            this.ctx.lineWidth = 2;

            // Draw different shapes based on node.shape
            this.drawNodeShape(node, x, y, size);

            // Draw node label
            let textColor = computedStyle.getPropertyValue('--text-color').trim();
            textColor = textColor || (this.isDarkTheme() ? 'white' : 'black');

            this.ctx.fillStyle = textColor;
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(node.name, x, y + size + 10);

            // Draw subtitle for hovered node
            if (this.hoveredNode && node.id === this.hoveredNode.id) {
                this.ctx.font = '10px Arial';
                this.ctx.fillStyle = textColor;
                this.ctx.globalAlpha = visibility * 0.8;
                this.ctx.fillText(node.subtitle, x, y + size + 25);
            }

            this.ctx.restore();
        }

        // Draw the appropriate shape for a node
        drawNodeShape(node, x, y, size) {
        if (node.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
        } else if (node.shape === 'square') {
                this.ctx.fillRect(x - size, y - size, size * 1.7, size * 1.7);
                this.ctx.strokeRect(x - size, y - size, size * 1.7, size * 1.7);
        } else if (node.shape === 'triangle') {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size);
                this.ctx.lineTo(x + size, y + size);
                this.ctx.lineTo(x - size, y + size);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
        } else if (node.shape === 'diamond') {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size);
                this.ctx.lineTo(x + size, y);
                this.ctx.lineTo(x, y + size);
                this.ctx.lineTo(x - size, y);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
        } else if (node.shape === 'pentagon') {
                this.ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                        const px = x + size * Math.cos(angle);
                        const py = y + size * Math.sin(angle);
                        if (i === 0) this.ctx.moveTo(px, py);
                        else this.ctx.lineTo(px, py);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
        } else if (node.shape === 'hexagon') {
                this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const hx = x + size * Math.sin(angle);
                const hy = y - size * Math.cos(angle);
                    if (i === 0) this.ctx.moveTo(hx, hy);
                    else this.ctx.lineTo(hx, hy);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
        } else if (node.shape === 'octagon') {
            this.ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const px = x + size * Math.cos(angle);
                const py = y + size * Math.sin(angle);
                if (i === 0) this.ctx.moveTo(px, py);
                else this.ctx.lineTo(px, py);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        } else {
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            }
    }

    // Function to draw links between nodes
        drawLink(link) {
        const source = link.source;
        const target = link.target;

            const sourceVisibility = this.visibilityMap[source.id] !== undefined ? this.visibilityMap[source.id] : 0;
            const targetVisibility = this.visibilityMap[target.id] !== undefined ? this.visibilityMap[target.id] : 0;
        const linkVisibility = Math.min(sourceVisibility, targetVisibility);

        if (linkVisibility <= 0.01) return;

            this.ctx.save();
            this.ctx.globalAlpha = linkVisibility;

            this.ctx.beginPath();
            this.ctx.moveTo(source.x, source.y);
            this.ctx.lineTo(target.x, target.y);

            const computedStyle = getComputedStyle(document.body);
            let textColor = computedStyle.getPropertyValue('--text-color').trim();
            textColor = textColor || (this.isDarkTheme() ? 'white' : 'black');

            this.ctx.strokeStyle = `rgba(${this.hexToRgb(textColor)}, 0.4)`;
        if (link.type === 'dotted') {
                this.ctx.setLineDash([5, 5]);
        } else {
                this.ctx.setLineDash([]);
            }
            this.ctx.lineWidth = Math.sqrt(link.value || 1) * 2;
            this.ctx.stroke();
            this.ctx.setLineDash([]);

        // Draw connection label if both nodes are highly visible
            if (linkVisibility > 0.7 && link.label) {
                this.drawLinkLabel(link, source, target, textColor);
            }

            this.ctx.restore();
        }

        // Draw label for a link
        drawLinkLabel(link, source, target, textColor) {
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            const textWidth = this.ctx.measureText(link.label).width;
            let bgColor = getComputedStyle(document.body).getPropertyValue('--card-background').trim();
            bgColor = bgColor || (this.isDarkTheme() ? '#333333' : '#ffffff');
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(midX - textWidth / 2 - 3, midY - 7, textWidth + 6, 14);
            this.ctx.fillStyle = `rgba(${this.hexToRgb(textColor)}, 1)`;
            this.ctx.fillText(link.label, midX, midY);
        }

        // Helper function to convert hex color to RGB
        hexToRgb(hex) {
            hex = hex.replace('#', '');

            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }

            const r = parseInt(hex.substring(0, 2), 16) || 255;
            const g = parseInt(hex.substring(2, 4), 16) || 255;
            const b = parseInt(hex.substring(4, 6), 16) || 255;

            return `${r}, ${g}, ${b}`;
        }

        // Function to draw grid pattern in the background
        drawGrid() {
            const gridSize = this.config.gridSize;
            const gridOpacity = this.config.gridOpacity;
            const gridLineWidth = this.config.gridLineWidth;

            this.ctx.save();

            const isDark = this.isDarkTheme();
            this.ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, ' + gridOpacity + ')' : 'rgba(0, 0, 0, ' + gridOpacity + ')';
            this.ctx.lineWidth = gridLineWidth;

            const centerX = this.width / 2 + this.config.centerOffsetX;
            const centerY = this.height / 2;

            const xStart = centerX % gridSize;
            const yStart = centerY % gridSize;

            // Draw vertical grid lines
            for (let x = xStart; x < this.width; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.height);
                this.ctx.stroke();
            }

            // Draw horizontal grid lines
            for (let y = yStart; y < this.height; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.width, y);
                this.ctx.stroke();
            }

            this.ctx.restore();
    }

    // Main draw function
        draw() {
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Draw the grid pattern first (in the background)
            this.drawGrid();

            // Draw links
            this.links.forEach(link => {
                this.drawLink(link);
        });

        // Draw nodes
            this.nodes.forEach(node => {
                this.drawNode(node);
        });

            // Update node visibilities
            this.updateNodeVisibilities();
    }

    // Update node visibilities with smooth transitions
        updateNodeVisibilities() {
            const fadeSpeed = this.config.fadeSpeed;

            // Cubic easing - smoother acceleration/deceleration
            const ease = (t) => {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            };

            this.nodes.forEach(node => {
                const current = this.visibilityMap[node.id] || 0;
            const target = node.targetVisibility;

                if (current !== target) {
                    // Calculate difference and progress
                    const difference = target - current;
                    const progress = 1 - (Math.abs(difference) / 1.0);

                    // Apply eased transition
                    if (Math.abs(difference) < fadeSpeed) {
                        this.visibilityMap[node.id] = target;
                    } else if (difference > 0) {
                        // Fade in with easing
                        const easedStep = fadeSpeed * (1 + ease(progress) * 0.5);
                        this.visibilityMap[node.id] = Math.min(current + easedStep, target);
                    } else {
                        // Fade out with easing
                        const easedStep = fadeSpeed * (1 + ease(progress) * 0.5);
                        this.visibilityMap[node.id] = Math.max(current - easedStep, target);
                    }
            }
        });
    }

    // Check if a node is considered settled
        isNodeSettled(node) {
        const velocityMagnitude = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
            const settlementThreshold = this.config.settlementThreshold;
            const settlementFramesRequired = this.config.settlementFramesRequired;

            if (!this.nodeVelocities[node.id]) {
                this.nodeVelocities[node.id] = [];
            }

            // Keep track of last 10 velocity values
            if (this.nodeVelocities[node.id].length >= 10) {
                this.nodeVelocities[node.id].shift();
            }
            this.nodeVelocities[node.id].push(velocityMagnitude);

            // Calculate average velocity
            const avgVelocity = this.nodeVelocities[node.id].reduce((sum, v) => sum + v, 0) /
                this.nodeVelocities[node.id].length;

            // Increment or reset settlement counter
        if (avgVelocity < settlementThreshold) {
                this.settlementMap[node.id] = (this.settlementMap[node.id] || 0) + 1;
        } else {
                this.settlementMap[node.id] = 0;
        }

            return this.settlementMap[node.id] >= settlementFramesRequired;
    }

    // Begin staged transition process
        beginStagedTransition() {
            this.transitionState = 'centerNode';
            this.transitionStartTime = Date.now();

            // Determine the initial center node based on URL navigation
            const personNode = this.nodes.find(n => n.type === 'person');
            let centerNode = personNode; // Default to person node

            // If we have a URL-specified node, use that as the center for transitions
            if (this.initialCenterNode && this.initialCenterNode.id !== personNode.id) {
                console.log('Using URL-specified node as center for transitions:', this.initialCenterNode.id);
                centerNode = this.initialCenterNode;

                // Make sure both the URL-specified node and person node are visible
                personNode.targetVisibility = 1;
            }

            // Make the center node visible
        centerNode.targetVisibility = 1;

        // All other nodes should be invisible at first
            this.nodes.filter(n => n.id !== centerNode.id && n.id !== personNode.id).forEach(n => {
            n.targetVisibility = 0;
        });

            this.loadingEl.style.display = 'none';

            // Give the center node a moment to appear, then move to first level
            setTimeout(() => {
                this.progressTransition();
            }, this.config.initialNodeDelay);
    }

    // Progress to the next transition stage
        progressTransition() {
            if (this.transitionState === 'centerNode') {
                this.transitionToFirstLevel();
            }
            else if (this.transitionState === 'firstLevel') {
                this.transitionToSecondLevel();
            }
            else if (this.transitionState === 'secondLevel' && this.nodeQueue.length === 0) {
                this.completeTransition();
            }
        }

        // Transition to showing first level nodes
        transitionToFirstLevel() {
            this.transitionState = 'firstLevel';
            this.transitionStartTime = Date.now();
            this.updateDebugInfo();

            this.loadingEl.textContent = 'Loading connections...';

            // Determine which node to use as center for finding connections
            const personNode = this.nodes.find(n => n.type === 'person');
            let centerNode = personNode;

            // If we have a URL-specified node, use that as the center
            if (this.initialCenterNode) {
                centerNode = this.initialCenterNode;
            }

            // Find nodes directly connected to the center node
            const firstLevelNodeIds = this.links
                .filter(link => link.source.id === centerNode.id || link.target.id === centerNode.id)
                .map(link => link.source.id === centerNode.id ? link.target.id : link.source.id);

            // Sequential visibility
            this.queueNodesForVisibility(firstLevelNodeIds);
        }

        // Transition to showing second level nodes
        transitionToSecondLevel() {
            this.transitionState = 'secondLevel';
            this.transitionStartTime = Date.now();
            this.updateDebugInfo();

            this.loadingEl.textContent = 'Completing graph...';

            // Find all currently visible nodes
            const visibleNodeIds = this.nodes
                .filter(node => this.visibilityMap[node.id] > 0.5)
                .map(node => node.id);

            // Find second level connections (nodes connected to visible nodes)
            const secondLevelNodeIds = [];
            this.links.forEach(link => {
                if (visibleNodeIds.includes(link.source.id) && !visibleNodeIds.includes(link.target.id)) {
                    if (!secondLevelNodeIds.includes(link.target.id)) {
                        secondLevelNodeIds.push(link.target.id);
                    }
                }
                if (visibleNodeIds.includes(link.target.id) && !visibleNodeIds.includes(link.source.id)) {
                    if (!secondLevelNodeIds.includes(link.source.id)) {
                        secondLevelNodeIds.push(link.source.id);
                    }
                }
            });

            // Make sure person node is visible regardless of connections
            const personNode = this.nodes.find(n => n.type === 'person');
            if (personNode && !visibleNodeIds.includes(personNode.id) && !secondLevelNodeIds.includes(personNode.id)) {
                secondLevelNodeIds.push(personNode.id);
            }

            this.queueNodesForVisibility(secondLevelNodeIds);
        }

        // Complete the transition
        completeTransition() {
            this.transitionState = 'complete';

            if (this.debug) {
                console.log(`Transition complete at ${Date.now() - this.transitionStartTime}ms`);
            }

            // Hide loading element
            this.loadingEl.style.opacity = '0';

            // Select the appropriate node after transition
            if (this.initialCenterNode) {
                console.log('Selecting initial center node:', this.initialCenterNode.id);

                // Make sure the node's section is added to the content panel
                this.addNodeSectionIfNeeded(this.initialCenterNode);

                // Then select the node to center it
                this.centerNode(this.initialCenterNode);
            } else {
                // Default to person node if available
                const personNode = this.nodes.find(n => n.type === 'person');
                if (personNode) {
                    this.selectNode(personNode);
                }
        }
    }

    // Queue nodes for sequential visibility
        queueNodesForVisibility(nodeIds) {
            this.nodeQueue = [];

        const nodesToQueue = nodeIds.filter(id => {
                const currentVisibility = this.visibilityMap[id] || 0;
                return currentVisibility < 0.5;
        });

        // Add nodes to queue in random order for more natural appearance
        const shuffledIds = [...nodesToQueue].sort(() => Math.random() - 0.5);

            // Add filtered nodes to the queue with progressive delays
            let delay = 0;
            shuffledIds.forEach((id, index) => {
                // Use progressive delays for smoother appearance
                setTimeout(() => {
                    this.nodeQueue.push(id);

                    // Start processing if this is the first one and not already processing
                    if (index === 0 && !this.nodeProcessingTimer) {
                        this.processNextNodeInQueue();
                    }

                    if (this.debugMode) {
                        this.debugQueue.textContent = this.nodeQueue.length;
                    }
                }, delay);

                // Increase delay for each successive node (20ms stagger)
                delay += 20;
            });

            // If no nodes to process, check settlement
            if (nodesToQueue.length === 0) {
                this.checkSettlementInterval();
        }
    }

    // Process the next node in the queue
        processNextNodeInQueue() {
            if (this.nodeQueue.length > 0) {
                const nodeId = this.nodeQueue.shift();
                const node = this.nodes.find(n => n.id === nodeId);

            if (node) {
                node.targetVisibility = 1;
                    this.lastNodeProcessedTime = Date.now();
                    this.addNodeSectionIfNeeded(node);

                    if (this.debugMode) {
                        this.debugQueue.textContent = this.nodeQueue.length;
                    }

                    this.nodeProcessingTimer = setTimeout(() => {
                        this.processNextNodeInQueue();
                    }, this.config.nodeProcessingInterval);
        } else {
                    this.nodeProcessingTimer = null;
                    this.checkSettlementInterval();
                }
            } else {
                this.nodeProcessingTimer = null;
                this.checkSettlementInterval();
            }
        }

        // Add a section for a node if it doesn't already exist
        addNodeSectionIfNeeded(node, expand = false) {
            if (!node) return;

            const existingSection = document.getElementById(`node-section-${node.id}`);
            if (!existingSection) {
                // Use description data we already have
                const nodeContent = this.nodeContentMap[node.id] || {
                    content: '<p>No content available</p>'
                };

                // Create section with collapsed=true to ensure it starts collapsed
                const sectionHTML = this.createNodeSection(node, '', nodeContent, true);

                this.nodeContentEl.insertAdjacentHTML('beforeend', sectionHTML);

                // Fix image paths in the content
                const contentSection = document.getElementById(`body-${node.id}`);
                if (contentSection) {
                    const contentDiv = contentSection.querySelector('.node-detail-content');
                    if (contentDiv) {
                        this.fixImagePaths(contentDiv, node.id);
                    }
                }

                const header = document.getElementById(`header-${node.id}`);
                const body = document.getElementById(`body-${node.id}`);

                if (header && body) {
                    header.addEventListener('click', () => {
                        body.classList.toggle('collapsed');
                        header.classList.toggle('collapsed');

                        if (!header.classList.contains('collapsed')) {
                            this.selectNode(node);
                        }

                        // Adjust card height when toggling section
                        this.adjustRightCardHeight();
                    });
                }

                if (expand) {
                    this.expandNode(node);
                }

                // Adjust card height after adding new section
                this.adjustRightCardHeight();
            }
        }

        // Remove sections for nodes that are no longer visible
        removeHiddenNodeSections(visibleNodeIds) {
            const sections = this.nodeContentEl.querySelectorAll('.content-section');
            let sectionsRemoved = false;

            sections.forEach(section => {
                const nodeId = section.id.replace('node-section-', '');
                const isPerson = this.nodes.find(n => n.id === nodeId && n.type === 'person');

                // Skip the person node as it should always be visible
                if (isPerson) return;

                // Remove sections for nodes that aren't in the visible list
                if (!visibleNodeIds.includes(nodeId)) {
                    section.remove();
                    sectionsRemoved = true;
                }
            });

            // If any sections were removed, adjust the card height
            if (sectionsRemoved) {
                this.adjustRightCardHeight();
        }
    }

    // Check settlement status at regular intervals
        checkSettlementInterval() {
        if (window.settlementCheckInterval) {
            clearInterval(window.settlementCheckInterval);
        }

        window.settlementCheckInterval = setInterval(() => {
                const visibleNodes = this.nodes.filter(node => this.visibilityMap[node.id] > 0.5);
                const unsettledNodes = visibleNodes.filter(node => !this.isNodeSettled(node));

                if (this.nodeQueue.length > 0) return;

            if (unsettledNodes.length === 0 &&
                    Date.now() - this.lastNodeProcessedTime > this.config.transitionDelay &&
                    Date.now() - this.transitionStartTime > this.config.transitionDelay) {

                clearInterval(window.settlementCheckInterval);
                    this.progressTransition();
            }
            }, 50);
    }

    // Update debug information
        updateDebugInfo() {
            if (this.debugMode) {
                this.debugTransition.textContent = this.transitionState;
                this.debugQueue.textContent = this.nodeQueue.length;
        }
    }

    // Main animation loop
        animate() {
        const currentTime = Date.now();
            const deltaTime = Math.min(32, currentTime - this.lastTime) / 16;
            this.lastTime = currentTime;

            this.applyForces(deltaTime);
            this.draw();
            this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    // Set up event listeners
        setupEventListeners() {
            // Mouse events
            this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            this.canvas.addEventListener('mouseup', () => this.handleMouseUp());

            // Touch events
            this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            this.canvas.addEventListener('touchend', () => this.handleTouchEnd());

            // Back/forward navigation
            window.addEventListener('popstate', (event) => this.handlePopState(event));

            // Zoom toggle
            this.zoomToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
                this.toggleZoom();
            });

            // Add event listener for mobile close button
            if (this.mobileCloseBtn) {
                this.mobileCloseBtn.addEventListener('click', () => {
                    if (this.isMobileDevice()) {
                        this.rightCardContainer.classList.remove('active');
                    }
                });
            }

            // Update mobile button visibility on window resize
            window.addEventListener('resize', () => {
                if (this.mobileCloseBtn) {
                    this.mobileCloseBtn.style.display = this.isMobileDevice() ? 'flex' : 'none';
                }
                // Hide sidebar when switching to mobile if not viewing a node
                if (this.isMobileDevice() && !this.selectedNode) {
                    this.rightCardContainer.classList.remove('active');
                }
            });
        }

        // Handle back/forward browser navigation
        handlePopState(event) {
            // Check if we have state with a nodeId
            if (event.state && event.state.nodeId) {
                const nodeId = event.state.nodeId;
                const node = this.nodes.find(n => n.id === nodeId);
                if (node) {
                    this.initialCenterNode = node;
                }
            } else {
                // If no state or no nodeId in state, probably back to home
                const personNode = this.nodes.find(n => n.type === 'person');
                if (personNode) {
                    // We don't call selectNode here to avoid pushing a new state
                    // Just update the UI without changing the history
                    this.centerOnNode(personNode);

                    // Expand the person node section and collapse others
                    this.nodeContentEl.querySelectorAll('.content-header').forEach(header => {
                        const headerNodeId = header.id.replace('header-', '');
                        const bodyEl = document.getElementById(`body-${headerNodeId}`);

                        if (headerNodeId !== personNode.id) {
                    header.classList.add('collapsed');
                    bodyEl.classList.add('collapsed');
                } else {
                    header.classList.remove('collapsed');
                    bodyEl.classList.remove('collapsed');

                            // Scroll the person section into view
                            setTimeout(() => {
                                const sectionEl = document.getElementById(`node-section-${personNode.id}`);
                                if (sectionEl) {
                                    // Scroll the card content container to show the section at the top
                                    this.cardContentEl.scrollTo({
                                        top: sectionEl.offsetTop,
                                        behavior: 'smooth'
                                    });
                                }
                            }, 50); // Short delay to ensure DOM has updated
                        }
                    });

                    // Adjust card height
                    this.adjustRightCardHeight();
                }
            }
        }

        // Select a node, displaying its content and updating the URL
        selectNode(node) {
            if (!node) return;

            this.initialCenterNode = node;
            this.centerNode(node);
            this.centerOnNode(node);

            // Update URL without page reload
            const url = node.url || (node.type === 'person' ? '/' : `/nodes/${node.id}`);
            history.pushState({}, document.title, url);

            // Add the node's section to the content card
            this.addNodeSectionIfNeeded(node);

            // Expand the selected node's section, collapse others
            if (node) {
                this.expandNode(node);
            }

            // Show sidebar on mobile devices when a node is selected
            if (this.isMobileDevice()) {
                this.rightCardContainer.classList.add('active');
            }

            this.adjustRightCardHeight();
        }

        centerNode(node) {
            // Clear any transition timers
            clearTimeout(this.transitionStageTimer);
            clearInterval(this.nodeProcessInterval);
            this.nodeQueue = [];

            // Update the state
            this.selectedNode = node;

            // Position the node at the center
            this.positionNodesForViewing(node);

            // Ensure the selected node is visible
            node.targetVisibility = 1;

            // Ensure the person node is visible if it exists
            const personNode = this.nodes.find(n => n.type === 'person');
            if (personNode) {
                personNode.targetVisibility = 1;
            }

            // Ensure the initialCenterNode is visible if it exists
            if (this.initialCenterNode) {
                this.initialCenterNode.targetVisibility = 1;
            }
        }

        expandNode(node) {
            this.nodeContentEl.querySelectorAll('.content-header').forEach(header => {
                const nodeId = header.id.replace('header-', '');
                const body = document.getElementById(`body-${nodeId}`);

                if (nodeId !== node.id) {
                    header.classList.add('collapsed');
                    body.classList.add('collapsed');
                } else {
                    header.classList.remove('collapsed');
                    body.classList.remove('collapsed');

                    // Scroll the section into view
                    setTimeout(() => {
                        const sectionEl = document.getElementById(`node-section-${node.id}`);
                        if (sectionEl) {
                            // Scroll the card content container to show the section at the top
                            this.cardContentEl.scrollTo({
                                top: sectionEl.offsetTop,
                                behavior: 'smooth'
                            });
                        }
                    }, 100); // Short delay to ensure DOM has updated
                }
            });
    }

    // Toggle zoom function to show/hide all nodes
        toggleZoom() {
            this.zoomedOut = !this.zoomedOut;

            if (this.zoomedOut) {
                this.zoomToggleBtn.innerHTML = '<i class="fas fa-plus"></i>';
                this.zoomToggleBtn.title = "Show focused view";
                this.zoomToggleBtn.classList.add('zoomed-out');
        } else {
                this.zoomToggleBtn.innerHTML = '<i class="fas fa-minus"></i>';
                this.zoomToggleBtn.title = "Show all nodes";
                this.zoomToggleBtn.classList.remove('zoomed-out');
            }

            if (this.selectedNode) {
                this.centerOnNode(this.selectedNode);
        } else {
                this.centerOnNode(this.nodes.find(n => n.type === 'person'));
        }
    }

    // Center the graph on a specific node with smooth transitions
        centerOnNode(node) {
        if (!node) return;

            const nodeDistances = this.findConnectedNodes(node.id);
            const visibleNodeIds = [node.id];
            const nodesToAddSectionsFor = [];
            const personNode = this.nodes.find(n => n.type === 'person');
            const personNodeId = personNode ? personNode.id : null;
            const initialCenterNodeId = this.initialCenterNode ? this.initialCenterNode.id : null;

        // Special case for the center/person node - only show direct connections by default
        const isPerson = node.type === 'person';

            if (isPerson && !this.zoomedOut) {
            // For person node, make both level 1 and level 2 nodes visible by default
                this.nodes.forEach(n => {
                // Show the person node and nodes up to 2 connections away
                const distance = nodeDistances.get(n.id);
                    if (n.id === node.id || distance === 1 || distance === 2 || n.id === initialCenterNodeId) {
                    n.targetVisibility = 1;
                        visibleNodeIds.push(n.id);

                        if (this.visibilityMap[n.id] >= 0.5 && n.id !== node.id) {
                            nodesToAddSectionsFor.push(n);
                        }
                } else {
                    n.targetVisibility = 0;
                }
            });

                const nodesToShow = this.nodes
                .filter(n => {
                    const distance = nodeDistances.get(n.id);
                        return (distance === 1 || distance === 2 || n.id === initialCenterNodeId) && (this.visibilityMap[n.id] || 0) < 0.5;
                })
                .map(n => n.id);

            if (nodesToShow.length > 0) {
                this.queueNodesForVisibility(nodesToShow);
            }
        }
            else if (this.zoomedOut) {
            // In zoomed out mode, show all nodes
                this.nodes.forEach(n => {
                n.targetVisibility = 1;
                    visibleNodeIds.push(n.id);

                    if (this.visibilityMap[n.id] >= 0.5 && n.id !== node.id) {
                        nodesToAddSectionsFor.push(n);
                    }
            });

                const nonVisibleNodeIds = this.nodes
                    .filter(n => (this.visibilityMap[n.id] || 0) < 0.5 && n.id !== node.id)
                .map(n => n.id);

            if (nonVisibleNodeIds.length > 0) {
                    this.queueNodesForVisibility(nonVisibleNodeIds);
            }
        }
        else {
                this.nodes.forEach(n => {
                    const distance = nodeDistances.get(n.id);
                    console.log("distance for", n.id, distance);
                    if (distance === undefined || (distance > 2 && n.id !== personNodeId && n.id !== initialCenterNodeId)) {
                        console.log("0 visibility for", n.id);
                        n.targetVisibility = 0;
                } else {
                    console.log("1 visibility for", n.id);
                        n.targetVisibility = 1;
                        visibleNodeIds.push(n.id);

                        if (this.visibilityMap[n.id] >= 0.5 && n.id !== node.id) {
                            nodesToAddSectionsFor.push(n);
                        }
                    }
                });

                // Always ensure the person node is visible even when not connected to current node
                if (personNode && !nodeDistances.has(personNodeId)) {
                    personNode.targetVisibility = 1;
                    visibleNodeIds.push(personNodeId);
                }

                // Always ensure the initialCenterNode is visible if it exists
                console.log("initialCenterNodeId", initialCenterNodeId);
                if (this.initialCenterNode && !nodeDistances.has(initialCenterNodeId) && initialCenterNodeId !== node.id) {
                    this.initialCenterNode.targetVisibility = 1;
                    visibleNodeIds.push(initialCenterNodeId);
                }
            }

            console.log("visibleNodeIds", visibleNodeIds);

            this.removeHiddenNodeSections(visibleNodeIds);
            nodesToAddSectionsFor.forEach(node => {
                this.addNodeSectionIfNeeded(node);
            });
            this.positionNodesForViewing(node, nodeDistances);
    }

    // Position nodes in a more organized way for viewing
        positionNodesForViewing(centerNode, nodeDistances) {
            const centerX = this.width / 2 + this.config.centerOffsetX;
            const centerY = this.height / 2;

            // If nodeDistances is not provided, calculate it
            if (!nodeDistances) {
                nodeDistances = this.findConnectedNodes(centerNode.id);
            }

            // Add a simple cubic easing for smoother movement
            const easeOutCubic = (t) => {
                return 1 - Math.pow(1 - t, 3);
            };

            // Apply easing based on distance to make movement more natural
            const dx = centerX - centerNode.x;
            const dy = centerY - centerNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Apply more easing for longer distances to make movement less snappy
            const easeAmount = easeOutCubic(Math.min(1, 100 / distance));
            const easedVelocity = this.config.centerNodeVelocity * (distance > 100 ? easeAmount : 1);

            // Move center node to center position
            centerNode.vx = dx * easedVelocity;
            centerNode.vy = dy * easedVelocity;

            const personNode = this.nodes.find(n => n.type === 'person');

            // Position first level nodes in a circle around the center
            this.positionFirstLevelNodes(centerNode, nodeDistances, centerX, centerY);

            // Position second level nodes in a wider circle
            this.positionSecondLevelNodes(nodeDistances, centerX, centerY);

            // Special handling for the initialCenterNode if it exists and is not the centerNode
            if (this.initialCenterNode && this.initialCenterNode.id !== centerNode.id) {
                // Position the initialCenterNode in a prominent location if it's not already positioned
                if (!nodeDistances.has(this.initialCenterNode.id)) {
                    const initialNodeX = centerX + this.config.firstLevelRadius / 2; // Position to the right side
                    const initialNodeY = centerY - this.config.firstLevelRadius / 3; // Slightly above center

                    this.initialCenterNode.vx = (initialNodeX - this.initialCenterNode.x) * this.config.centerNodeVelocity;
                    this.initialCenterNode.vy = (initialNodeY - this.initialCenterNode.y) * this.config.centerNodeVelocity;
                }
            }

            // Position outer nodes based on whether we're viewing the person node
        if (centerNode.type === 'person') {
                this.positionOuterNodesForPersonView(centerNode, nodeDistances, centerX, centerY);
            } else {
                this.positionOuterNodesForNonPersonView(centerNode, nodeDistances, personNode, centerX, centerY);
            }
        }

        // Position outer nodes when viewing the person node
        positionOuterNodesForPersonView(centerNode, nodeDistances, centerX, centerY) {
            const outerNodes = this.nodes.filter(n => !nodeDistances.has(n.id) && n.id !== centerNode.id);

            // Skip if there are no outer nodes
            if (!outerNodes.length) return;

            outerNodes.forEach((node, i) => {
                const angle = 2 * Math.PI * i / outerNodes.length;
                const targetX = centerX + this.config.outerLevelRadius * Math.cos(angle);
                const targetY = centerY + this.config.outerLevelRadius * Math.sin(angle);

                node.vx = (targetX - node.x) * this.config.outerNodeVelocity;
                node.vy = (targetY - node.y) * this.config.outerNodeVelocity;
            });
        }

        // Position outer nodes when viewing a non-person node
        positionOuterNodesForNonPersonView(centerNode, nodeDistances, personNode, centerX, centerY) {
            // 1. Position distant nodes
            const outerNodes = this.nodes.filter(n => !nodeDistances.has(n.id) && n.id !== centerNode.id && n.type !== 'person' && (!this.initialCenterNode || n.id !== this.initialCenterNode.id));

            // Only position outer nodes if there are any
            if (outerNodes.length) {
                outerNodes.forEach((node, i) => {
                    const angle = 2 * Math.PI * i / outerNodes.length;
                    const targetX = centerX + this.config.outerLevelRadius * Math.cos(angle);
                    const targetY = centerY + this.config.outerLevelRadius * Math.sin(angle);

                    node.vx = (targetX - node.x) * this.config.outerNodeVelocity;
                    node.vy = (targetY - node.y) * this.config.outerNodeVelocity;
                });
            }

            // 2. Special positioning for person node if it's not connected to current node
            if (personNode && personNode.id !== centerNode.id && !nodeDistances.has(personNode.id)) {
                // Position person node at the left side of the graph with a slight offset
                const personTargetX = centerX - this.config.personOffsetX;
                const personTargetY = centerY - this.config.personOffsetY;

                personNode.vx = (personTargetX - personNode.x) * this.config.centerNodeVelocity;
                personNode.vy = (personTargetY - personNode.y) * this.config.centerNodeVelocity;
            }
        }

        // Position first level connected nodes
        positionFirstLevelNodes(centerNode, nodeDistances, centerX, centerY) {
            const firstLevelNodes = this.nodes.filter(n => nodeDistances.get(n.id) === 1);

            // Skip if there are no first level nodes
            if (!firstLevelNodes.length) return;

            firstLevelNodes.forEach((node, i) => {
                const angle = 2 * Math.PI * i / firstLevelNodes.length;
                const targetX = centerX + this.config.firstLevelRadius * Math.cos(angle);
                const targetY = centerY + this.config.firstLevelRadius * Math.sin(angle);

                node.vx = (targetX - node.x) * this.config.firstLevelVelocity;
                node.vy = (targetY - node.y) * this.config.firstLevelVelocity;
            });
        }

        // Position second level connected nodes
        positionSecondLevelNodes(nodeDistances, centerX, centerY) {
            const secondLevelNodes = this.nodes.filter(n => nodeDistances.get(n.id) === 2);

            // Skip if there are no second level nodes
            if (!secondLevelNodes.length) return;

            secondLevelNodes.forEach((node, i) => {
                const angle = 2 * Math.PI * i / secondLevelNodes.length;
                const targetX = centerX + this.config.secondLevelRadius * Math.cos(angle);
                const targetY = centerY + this.config.secondLevelRadius * Math.sin(angle);

                node.vx = (targetX - node.x) * this.config.secondLevelVelocity;
                node.vy = (targetY - node.y) * this.config.secondLevelVelocity;
            });
    }

    // Find nodes that are connected to a central node and calculate their distance
        findConnectedNodes(nodeId) {
            if (!nodeId) return new Map(); // Return empty map if no nodeId is provided

        const nodeDistances = new Map();
        nodeDistances.set(nodeId, 0);

        // Build adjacency list
        const graph = {};
            this.nodes.forEach(node => {
            graph[node.id] = [];
        });

            // Make sure links are properly initialized
            if (this.links && Array.isArray(this.links)) {
                this.links.forEach(link => {
                    // Handle both object references and direct ID references
                    const sourceId = link.source.id || link.source;
                    const targetId = link.target.id || link.target;

                    if (sourceId && targetId) {
                        if (graph[sourceId]) graph[sourceId].push(targetId);
                        if (graph[targetId]) graph[targetId].push(sourceId);
                    }
                });
            }

        // Perform BFS to find all connected nodes and their distances
        const queue = [{ id: nodeId, distance: 0 }];
        while (queue.length > 0) {
            const { id, distance } = queue.shift();

                // Skip if the node ID is not in the graph
                if (!graph[id]) continue;

            graph[id].forEach(neighborId => {
                if (nodeDistances.has(neighborId)) return;
                nodeDistances.set(neighborId, distance + 1);

                    // Continue BFS if within our limit (nodes up to 2 connections away)
                if (distance < 2) {
                    queue.push({ id: neighborId, distance: distance + 1 });
                }
            });
        }

        return nodeDistances;
    }

    // Handle mouse movement
        handleMouseMove(e) {
            const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

            // Find node under cursor
            let hovered = this.findNodeAtPosition(x, y);

            // Update cursor and hoveredNode if changed
            if (this.hoveredNode !== hovered) {
                this.hoveredNode = hovered;
                this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'default';
            }

            // Handle dragging
            if (this.draggedNode) {
                const dx = x - this.lastMouseX;
                const dy = y - this.lastMouseY;

                this.draggedNode.x += dx;
                this.draggedNode.y += dy;

                this.draggedNode.vx = 0;
                this.draggedNode.vy = 0;

                this.dragDistance += Math.sqrt(dx * dx + dy * dy);
            }

            this.lastMouseX = x;
            this.lastMouseY = y;
        }

        // Find node at a specific position
        findNodeAtPosition(x, y) {
            // Check from last to first to prioritize nodes drawn on top
            for (let i = this.nodes.length - 1; i >= 0; i--) {
                const node = this.nodes[i];

                if (this.visibilityMap[node.id] <= 0.1) continue;

                const dx = node.x - x;
                const dy = node.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < node.radius) {
                    return node;
                }
            }
            return null;
    }

    // Handle mouse down for dragging
        handleMouseDown(e) {
            if (this.hoveredNode) {
                this.draggedNode = this.hoveredNode;
                this.dragDistance = 0;
                e.preventDefault();
            } else if (this.isMobileDevice() && this.rightCardContainer.classList.contains('active')) {
                // Close the sidebar on mobile when clicking on the canvas (outside of content)
                this.rightCardContainer.classList.remove('active');
            }
        }

    // Handle mouse up to end dragging
        handleMouseUp() {
            if (this.draggedNode) {
            // If moved less than 5px, consider it a click
                if (this.dragDistance < 5) {
                    this.selectNode(this.draggedNode);
            }

            setTimeout(() => {
                    this.draggedNode = null;
            }, 100);
        }
    }

    // Touch event handlers
        handleTouchStart(e) {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                // Find touched node
                const touchedNode = this.findNodeAtPosition(x, y);

                if (touchedNode) {
                    this.draggedNode = touchedNode;
                    this.lastMouseX = x;
                    this.lastMouseY = y;
                    this.dragDistance = 0;
                    e.preventDefault();
                } else {
                    // If no node is touched, allow panning the entire graph on mobile
                    this.isPanning = true;
                    this.lastPanX = x;
                    this.lastPanY = y;
                    e.preventDefault();
                }
            }
        }

        handleTouchMove(e) {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                if (this.draggedNode) {
                    const dx = x - this.lastMouseX;
                    const dy = y - this.lastMouseY;

                    this.draggedNode.x += dx;
                    this.draggedNode.y += dy;

                    this.draggedNode.vx = 0;
                    this.draggedNode.vy = 0;

                    this.lastMouseX = x;
                    this.lastMouseY = y;

                    this.dragDistance += Math.sqrt(dx * dx + dy * dy);

                    e.preventDefault();
                } else if (this.isPanning) {
                    // Pan the entire graph
                    const dx = x - this.lastPanX;
                    const dy = y - this.lastPanY;
                    this.lastPanX = x;
                    this.lastPanY = y;

                    // Move all nodes in the same direction
                    this.nodes.forEach(node => {
                        node.x += dx;
                        node.y += dy;
                    });

                    e.preventDefault();
                }
            }
        }

        handleTouchEnd() {
            if (this.draggedNode) {
                if (this.dragDistance < 5) {
                    this.selectNode(this.draggedNode);
                }

            setTimeout(() => {
                    this.draggedNode = null;
            }, 100);
        }

        this.isPanning = false;
    }

        // Function to extract node ID from URL and select that node
        handleUrlNavigation() {
            const path = window.location.pathname;
            const nodeUrlPattern = /\/nodes\/([^\/]+)\/?$/;
            const match = path.match(nodeUrlPattern);

            if (match && match[1]) {
                const nodeId = match[1];
                console.log('URL navigation: Found node ID in URL:', nodeId);

                // Find the node with this ID
                const targetNode = this.nodes.find(node => node.id === nodeId);

                // If node exists, store it as initial center node and show its content immediately
                if (targetNode) {
                    console.log('URL navigation: Selecting node:', targetNode);
                    this.initialCenterNode = targetNode;
                    this.selectedNode = targetNode; // Set as selected node
                    this.centerNode(this.initialCenterNode);

                    // Show the node's content immediately without waiting for transitions
                    this.addNodeSectionIfNeeded(targetNode, true);

                    // Show sidebar on mobile
                    if (this.isMobileDevice()) {
                        this.rightCardContainer.classList.add('active');
                    }
                } else {
                    console.log('URL navigation: Node not found with ID:', nodeId);
                    // We need to wait for data to load, then try again
                    const checkInterval = setInterval(() => {
                        const node = this.nodes.find(n => n.id === nodeId);
                        if (node) {
                            clearInterval(checkInterval);
                            console.log('URL navigation: Node found after waiting, selecting:', node);
                            this.initialCenterNode = node;
                            this.selectedNode = node; // Set as selected node

                            // Show the node's content immediately when we find it
                            this.addNodeSectionIfNeeded(node);

                            // Show sidebar on mobile
                            if (this.isMobileDevice()) {
                                this.rightCardContainer.classList.add('active');
                            }
                        }
                    }, 500);

                    // Clear interval after 10 seconds to prevent infinite checking
                    setTimeout(() => {
                        if (checkInterval) {
                            clearInterval(checkInterval);
                            console.log('URL navigation: Gave up waiting for node');
                        }
                    }, 10000);
                }
            }
        }

        // Helper function to detect if dark theme is active
        isDarkTheme() {
            if (document.body.classList.contains('dark')) {
                return true;
            }

            if (document.documentElement.classList.contains('dark')) {
                return true;
            }

            const bgColor = getComputedStyle(document.body).backgroundColor;
            if (bgColor) {
                const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
                if (rgbMatch) {
                    const [, r, g, b] = rgbMatch.map(Number);
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    return brightness < 128;
                }
            }

            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return true;
            }

            return false;
        }

        // Function to adjust rightCard height based on content
        adjustRightCardHeight() {
            // Get all visible sections
            const sections = this.nodeContentEl.querySelectorAll('.content-section');
            const expandedSections = [...sections].filter(section =>
                !section.querySelector('.content-body').classList.contains('collapsed')
            );

            // Base height calculation - start with minimum height percentage
            let heightPercentage = 50; // Default 50% height

            // Add height for each expanded section (approximate)
            if (expandedSections.length > 0) {
                // Each additional expanded section adds some height
                heightPercentage = Math.min(50 + (expandedSections.length * 10), this.config.maxCardHeight);
            }

            // Apply the calculated height
            this.rightCard.style.height = `${heightPercentage}vh`;

            // Center the card vertically
            this.rightCard.style.top = `${(100 - heightPercentage) / 2}vh`;
        }

        // Helper function to fix relative image paths
        fixImagePaths(contentDiv, nodeId) {
            const images = contentDiv.querySelectorAll('img');
            images.forEach(img => {
                const src = img.getAttribute('src');
                if (src) {
                    // Handle absolute paths starting with /
                    if (src.startsWith('/')) {
                        // Keep the leading slash for absolute paths
                        img.setAttribute('src', src);
                    }
                    // Handle relative paths
                    else if (!src.startsWith('http')) {
                        // For relative paths in markdown, make them absolute
                        img.setAttribute('src', `/nodes/${nodeId}/${src}`);
                    }
                }

                // Make images clickable to expand
                img.style.cursor = 'pointer';
                img.classList.add('expandable-image');
                img.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showExpandedImage(this.src, this.alt);
                });
            });
        }

        // Add a utility method to check if we're on a mobile device
        isMobileDevice() {
            return window.innerWidth <= 1000;
        }
    }

        // Function to show expanded image in a modal
        function showExpandedImage(src, alt) {
            // Create modal elements if they don't exist
            if (!imageModal) {
                // Create modal container
                imageModal = document.createElement('div');
                imageModal.classList.add('image-modal');
                imageModal.style.display = 'none';

                // Create close button
                const closeBtn = document.createElement('button');
                closeBtn.classList.add('image-modal-close');
                closeBtn.innerHTML = '&times;';
                closeBtn.addEventListener('click', hideExpandedImage);

                // Create image element
                modalImage = document.createElement('img');
                modalImage.classList.add('image-modal-content');

                // Create caption
                imageCaption = document.createElement('div');
                imageCaption.classList.add('image-modal-caption');

                // Append elements
                imageModal.appendChild(closeBtn);
                imageModal.appendChild(modalImage);
                imageModal.appendChild(imageCaption);

                // Add modal to body
                document.body.appendChild(imageModal);

                // Close modal when clicking outside the image
                imageModal.addEventListener('click', function(e) {
                    if (e.target === imageModal) {
                        hideExpandedImage();
                    }
                });

                // Add keyboard support (ESC to close)
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && imageModal.style.display === 'flex') {
                        hideExpandedImage();
                    }
                });

                // Add CSS for the modal (now moved to CSS file)
                const style = document.createElement('style');
                style.textContent = ``;  // Content moved to CSS file
                document.head.appendChild(style);
            }

            // Set image source and caption
            modalImage.src = src;
            imageCaption.textContent = alt || '';

            // Show modal
            imageModal.style.display = 'flex';

            // Prevent scrolling on the body when modal is open
            document.body.style.overflow = 'hidden';
        }

        // Function to hide the expanded image
        function hideExpandedImage() {
            if (imageModal) {
                imageModal.style.display = 'none';

                // Restore scrolling
                document.body.style.overflow = '';
            }
        }

    // Initialize the graph visualization
    const graphViz = new GraphVisualization();

    // Expose redrawGraph function globally for theme switching
    window.redrawGraph = function() {
        if (graphViz.animationFrame) {
            cancelAnimationFrame(graphViz.animationFrame);
        }

        document.documentElement.style.display = 'none';
        document.documentElement.offsetHeight;
        document.documentElement.style.display = '';

        console.log("Redrawing graph. Dark theme detected:", graphViz.isDarkTheme());
        graphViz.ctx.clearRect(0, 0, graphViz.width, graphViz.height);

        graphViz.drawGrid();

        graphViz.links.forEach(link => {
            graphViz.drawLink(link);
        });

        graphViz.nodes.forEach(node => {
            graphViz.drawNode(node);
        });

        graphViz.animationFrame = requestAnimationFrame(() => graphViz.animate());
    };
});
