import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import EmbeddingVisualization from '../EmbeddingVisualization';

// Mock the fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockVisualizationData = {
  id: 1,
  method: 'umap',
  dimensions: 2,
  coordinates: [[1, 2], [3, 4], [5, 6]],
  clusters: [0, 1, 0]
};

describe('EmbeddingVisualization', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('renders loading state initially', () => {
    render(
      <MemoryRouter initialEntries={['/embeddings/1']}>
        <Route path="/embeddings/:embeddingId">
          <EmbeddingVisualization />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays visualization when data is loaded', async () => {
    mockFetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'complete', progress: 100 })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([mockVisualizationData])
      }));

    render(
      <MemoryRouter initialEntries={['/embeddings/1']}>
        <Route path="/embeddings/:embeddingId">
          <EmbeddingVisualization />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('UMAP')).toBeInTheDocument();
      expect(screen.getByText('PCA')).toBeInTheDocument();
    });
  });

  it('handles export functionality', async () => {
    mockFetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'complete', progress: 100 })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([mockVisualizationData])
      }));

    render(
      <MemoryRouter initialEntries={['/embeddings/1']}>
        <Route path="/embeddings/:embeddingId">
          <EmbeddingVisualization />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export CSV'));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/export?format=csv'),
      expect.any(Object)
    );
  });
});