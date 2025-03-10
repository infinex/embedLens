// ... (continuing from previous code)
          colorScheme="category10"
          interactionMode={dimensions === 3 ? "orbit" : "pan"}
          tooltipContent={(point) => `
            <div class="tooltip">
              <div>Cluster: ${point.cluster}</div>
              <div>X: ${point.x.toFixed(3)}</div>
              <div>Y: ${point.y.toFixed(3)}</div>
              ${point.z ? `<div>Z: ${point.z.toFixed(3)}</div>` : ''}
            </div>
          `}
        />
      </div>

      <div className="filters">
        <Select
          mode="multiple"
          placeholder="Filter by clusters"
          style={{ width: '200px' }}
          onChange={(values: number[]) => {
            const filteredPoints = points.filter(p => 
              values.length === 0 || values.includes(p.cluster)
            );
            setFilteredPoints(filteredPoints);
          }}
          options={Array.from(new Set(points.map(p => p.cluster))).map(cluster => ({
            label: `Cluster ${cluster}`,
            value: cluster
          }))}
        />
      </div>
    </div>
  );
}

export default EmbeddingVisualization;