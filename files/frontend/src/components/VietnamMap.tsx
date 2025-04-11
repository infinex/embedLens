import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Scatterplot } from 'deepscatter'; // Adjust import based on your module structure
// If no types exist: import * as ScatterplotModule from 'deepscatter'; const Scatterplot = ScatterplotModule.Scatterplot;
import { select } from 'd3-selection';
import styles from './VietnamMap.module.css';

// Basic type definition for deepscatter instance if official types aren't available
// Adjust based on the actual API methods you use
interface DeepScatterInstance {
  plotAPI: (prefs: any) => Promise<any>;
  add_labels_from_url: (
    url: string,
    name: string,
    labelField: string,
    sizeField?: string,
    options?: any
  ) => Promise<any>;
  _renderer?: { // Accessing internal state, use with caution
    aes?: {
      store?: {
        color?: {
          current?: {
            scale?: d3.ScaleOrdinal<string, string> | d3.ScaleLinear<string, string>; // Adjust scale type as needed
          };
        };
      };
    };
  };
  // Add other methods used if necessary
}

// Data structure for legend items
interface LegendItem {
  id: string;
  text: string;
  color: string;
}

const VietnamScatterplot: React.FC = () => {
  const scatterContainerRef = useRef<HTMLDivElement>(null);
  const scatterplotRef = useRef<DeepScatterInstance | null>(null);
  const [dateString, setDateString] = useState<string>('');
  const [sliderValue, setSliderValue] = useState<number>(0); // Initial slider value (adjust as needed)
  const [legendItems, setLegendItems] = useState<LegendItem[]>([]);
  const [clickedDatum, setClickedDatum] = useState<any>(null); // State to hold clicked data

  const INITIAL_SLIDER_VALUE = 0; // Or derive from HTML min/max if needed

  const plotFields = [
    'MILSERVICE',
    'PERIODOFDAY',
    'UNIT',
    'GEOZONE',
    'AIRFORCEGROUP',
    'TGTTYPE',
    'MFUNC_DESC',
    'TAKEOFFLOCATION',
  ];

  // Function to update the legend state based on the current scatterplot scale
  const updateLegendState = useCallback(() => {
    if (!scatterplotRef.current?._renderer?.aes?.store?.color?.current?.scale) {
      console.warn('Could not find scale to update legend.');
      setLegendItems([]); // Clear legend if scale is not found
      return;
    }

    const scale = scatterplotRef.current._renderer.aes.store.color.current.scale;
    // Type guard for d3 scale
    if (typeof scale.domain !== 'function' || typeof scale.range !== 'function' || typeof scale !== 'function') {
        console.warn('Scale object does not have expected d3 methods.');
        setLegendItems([]);
        return;
    }

    const domain = scale.domain();
    // Limit items for display, similar to original code
    const items: LegendItem[] = domain.slice(0, 15).map((d) => ({
      id: String(d), // Use domain value as key/id
      text: String(d),
      color: scale(d) as string, // Get color from scale
    }));
    setLegendItems(items);
  }, []); // No dependencies needed as it reads from ref

  // Function to calculate date string
  const calculateDateString = (value: number): string => {
    // JS Date months are 0-indexed. Days are 1-indexed, but day 0 gives last day of prev month.
    // `new Date(year, monthIndex, day)`
    // Using value as day offset from 1970-01-01 seems implied by the original code.
    const baseDate = new Date(1970, 0, 1); // Jan 1, 1970
    const centerDate = new Date(baseDate.setDate(baseDate.getDate() + value));

    const date1 = new Date(centerDate);
    date1.setDate(centerDate.getDate() - 15);

    const date2 = new Date(centerDate);
    date2.setDate(centerDate.getDate() + 15);

    return `${date1.toDateString()} to ${date2.toDateString()}`;
  };

  // Effect for initializing the scatterplot
  useEffect(() => {
    if (!scatterContainerRef.current || scatterplotRef.current) {
      // Already initialized or container not ready
      return;
    }

    // Define prefs inside useEffect or make constant outside if truly static
    const prefs = {
      source_url: 'https://bmschmidt.github.io/vietnam_war/',
      max_points: 1000,
      alpha: 10.12,
      zoom_balance: 0.12,
      point_size: 2,
      background_color: '#112233',
      // Use a function for click handler to integrate with React state
      click_function: (datum: any) => {
         // Update React state instead of direct DOM manipulation
         setClickedDatum(datum);
      },
      zoom: {
        bbox: {
          x: [99.15172120932304, 114.17888963818825],
          y: [7.0849741134400706, 23.626158008070647],
        },
      },
      encoding: {
        jitter_radius: {
          constant: 0.001,
          method: 'normal',
        },
        color: {
          field: 'MILSERVICE', // Initial field
          domain: ['VNAF', 'USAF', 'USN', 'USMC', 'RLAF', 'RAAF', 'KAF', 'USA'],
          range: [
            'steelblue', 'green', 'navy', 'green', 'orange', 'gray', 'blue', 'red',
          ],
        },
        x: { field: 'x', transform: 'literal' },
        y: { field: 'y', transform: 'literal' },
      },
    };

    // Explicitly cast to 'any' if necessary due to lack of types
    const scatterplot = new (Scatterplot as any)(
        scatterContainerRef.current
      ) as DeepScatterInstance;
    scatterplotRef.current = scatterplot;

    console.log('Initializing DeepScatter...');
    const firstDrawPromise = scatterplot.plotAPI(prefs);

    firstDrawPromise
      .then(async () => {
        console.log('Initial plot complete.');
        try {
          await scatterplot.add_labels_from_url(
            // Adjust path if needed based on your public folder structure
            '/tests/TAKEOFFLOCATION.geojson',
            'takeoff',
            'TAKEOFFLOCATION',
            undefined, // no size field
            { draggable_labels: true, useColorScale: true }
          );
          console.log('Labels added.');
          updateLegendState(); // Update legend after initial draw
        } catch (error) {
            console.error("Failed to add labels:", error);
        }
      })
      .catch((error) => {
        console.error('Error during initial plot or label loading:', error);
      });

      // Set initial state based on default slider value
      setSliderValue(INITIAL_SLIDER_VALUE);
      setDateString(calculateDateString(INITIAL_SLIDER_VALUE));


    // Cleanup function
    return () => {
      console.log('Cleaning up DeepScatter component');
      // Add cleanup logic if deepscatter provides it (e.g., scatterplot.destroy())
      // scatterplotRef.current?.destroy?.();
      scatterplotRef.current = null;
      // Consider removing the container's contents if needed
      if (scatterContainerRef.current) {
          // scatterContainerRef.current.innerHTML = ''; // Use cautiously
      }
    };
    // updateLegendState is stable due to useCallback([])
  }, [updateLegendState]); // Re-run if updateLegendState changes (it shouldn't)

  // Handler for button clicks to change plot encoding
  const handleButtonClick = (field: string) => {
    if (!scatterplotRef.current) return;

    console.log(`Updating plot for field: ${field}`);
    scatterplotRef.current
      .plotAPI({
        duration: 0.5, // Use seconds for duration as per docs potentially
        labels: {
          url: `/tests/${field}.geojson`, // Adjust path if needed
          name: field, // Use field name for label layer name
          label_field: field,
          size_field: undefined,
        },
        encoding: {
          color: {
            field: field,
            range: 'okabe', // Using okabe-ito color scheme
             // Domain might need adjustment based on field type
             // For categorical, could omit domain to let library infer
             // For numerical, adjust range, e.g., [-2047, 2047] was in original code
             // Let's omit domain for now and let deepscatter try to infer
          },
        },
      })
      .then(() => {
        console.log(`Plot updated for ${field}.`);
        updateLegendState(); // Update legend after plot update
      })
      .catch((error) => {
        console.error(`Error updating plot for field ${field}:`, error);
      });
  };

  // Handler for slider input change
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!scatterplotRef.current) return;

    const value = parseInt(event.target.value, 10);
    setSliderValue(value);
    setDateString(calculateDateString(value));

    // Debounce this call if performance becomes an issue
    scatterplotRef.current
      .plotAPI({
        // Keep alpha/max_points/point_size low for filtering performance?
        // Original code used: alpha: 3.5, max_points: 1000, point_size: 5
        alpha: 3.5,
        max_points: 1000, // Or adjust as needed
        point_size: 5,
        duration: 0.1, // Fast update
        encoding: {
          filter: {
            field: 'MSNDATE', // Field to filter on
            op: 'within',
            // 'a' is the +/- range, 'b' is the center value
            a: 15, // +/- 15 days
            b: value, // Center value from slider
          },
          // Important: Reset color encoding if it was changed by buttons
          // Or decide if filter should maintain the last selected color scheme
          // Resetting to initial 'MILSERVICE' for consistency here:
           color: {
             field: 'MILSERVICE',
             domain: ['VNAF', 'USAF', 'USN', 'USMC', 'RLAF', 'RAAF', 'KAF', 'USA'],
             range: [
               'steelblue', 'green', 'navy', 'green', 'orange', 'gray', 'blue', 'red',
             ],
           },
        },
      })
       // No need to update legend here if we reset color encoding to default
      // .then(updateLegendState)
      .catch((error) => {
        console.error('Error updating plot for date filter:', error);
      });
  };

  return (
    <div>
      <h1>Vietnam War Air Sorties (DeepScatter)</h1>

      <div className={styles.dateString}>{dateString || 'Loading date...'}</div>
      <input
        id="date-slider" // Changed ID to avoid conflict with potential global styles
        className={styles.dateInput}
        title="Date Selector (Approximate Range)"
        type="range"
        min="-1800" // Corresponds to roughly 5 years before 1970
        max="1500"  // Corresponds to roughly 4 years after 1970
        value={sliderValue}
        onChange={handleSliderChange}
      />

      <div ref={scatterContainerRef} className={styles.deepscatterContainer}>
        {/* Overlays are positioned absolutely relative to this container */}
        <div className={styles.leftOverlay}>
          <strong>Color By:</strong>
          {plotFields.map((field) => (
            <button key={field} onClick={() => handleButtonClick(field)}>
              {field}
            </button>
          ))}
        </div>

        <div className={styles.colorLegend}>
          <strong>Legend:</strong>
          {legendItems.map((item) => (
            <div
              key={item.id}
              className={styles.legendDiv}
              style={{ backgroundColor: item.color }}
            >
              {item.text}
            </div>
          ))}
          {legendItems.length === 0 && <span>No legend available</span>}
        </div>
      </div>

       {/* Display clicked data */}
       {clickedDatum && (
         <div className={styles.clickedData}>
           <strong>Clicked Point Data:</strong>
           <pre>{JSON.stringify(clickedDatum, null, 2)}</pre>
         </div>
       )}
    </div>
  );
};

export default VietnamScatterplot;