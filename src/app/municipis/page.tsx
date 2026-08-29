import type { Metadata } from "next";
import { getAllMunicipalities } from "@/data/queries";
import { MunicipalitiesTable } from "./municipalities-table";

export const metadata: Metadata = {
  title: "Els 947 municipis",
  description:
    "Totes les dades importades de Wikidata per als 947 municipis de Catalunya, per revisar-les.",
};

/** Reads live so a re-seed shows up on the next reload; this is a data-review page. */
export const dynamic = "force-dynamic";

export default async function MunicipisPage() {
  const municipalities = await getAllMunicipalities();
  return <MunicipalitiesTable municipalities={municipalities} />;
}
