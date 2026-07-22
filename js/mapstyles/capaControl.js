export class CapaControl {
    onAdd(map) {
        this._map = map;
        this._container = document.createElement("div");
        this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerHTML = "🛰️"; // icono satélite
        btn.title = "Cambiar capa";

        btn.onclick = () => {
            const visible = map.getLayoutProperty("satellite-layer", "visibility");
            map.setLayoutProperty(
                "satellite-layer",
                "visibility",
                visible === "none" ? "visible" : "none"
            );
        };

        this._container.appendChild(btn);
        return this._container;
    }

    onRemove() {
        this._container.remove();
        this._map = undefined;
    }
}
