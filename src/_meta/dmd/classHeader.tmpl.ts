import { md } from "@tmpl/core";
import type { ClassDef } from "@deno/doc";

export function classHeaderTemplate(
	name: string,
	def: ClassDef,
) {
	const isAbstract = def.isAbstract ? "abstract " : "";
	const typeParams = def.typeParams?.length
		? `<${def.typeParams.map((t) => t.name).join(", ")}>`
		: "";

	const extendsClause = def.extends ? ` extends ${def.extends}` : "";

	const implementsClause = def.implements?.length
		? ` implements ${def.implements.map((i) => i.repr).join(", ")}`
		: "";

	return md`
  ## ${isAbstract}class ${name}${typeParams}${extendsClause}${implementsClause}
  `;
}
