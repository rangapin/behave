import { BankEditor } from "@/components/BankEditor";
import styles from "../page.module.css";

export default function BankPage() {
  return (
    <main className={styles.main}>
      <BankEditor />
    </main>
  );
}
