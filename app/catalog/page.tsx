import type { Metadata } from 'next';
import Catalog from '@/components/Catalog';
import { Kicker } from '@/components/ui';
import { getTrucks } from '@/lib/trucks';

export const metadata: Metadata = {
  title: 'Truck Catalog',
  description: 'Available trucks with photo gallery and truck details.',
};

// the list comes from the Google Sheet; refresh it at most every 5 minutes
export const revalidate = 300;

export default async function CatalogPage() {
  const trucks = await getTrucks();
  return (
    <>
      <section className="page-hero catalog-hero" aria-labelledby="cat-h1">
        <div className="container">
          <Kicker>Inventory</Kicker>
          <h1 id="cat-h1" className="h1" data-reveal>
            Truck Catalog
          </h1>
          <p className="lead" data-reveal style={{ ['--d' as string]: '.08s' }}>
            Available trucks with photo gallery and truck details.
          </p>
        </div>
      </section>
      <section className="section catalog-sec">
        <div className="container">
          <Catalog trucks={trucks} />
        </div>
      </section>
    </>
  );
}
