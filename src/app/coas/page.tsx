import { redirect } from "next/navigation";

/** The COA library was merged into /quality: how a batch is tested and what
 *  the results were are one argument, not two pages. */
export default function CoaLibraryPage() {
  redirect("/quality#coas");
}
