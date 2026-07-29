import argparse
import platform
import subprocess
import time
from datetime import datetime

# Terminal renk kodları
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"

def ping_host(host: str) -> tuple[bool, float]:
    """Sistem komut satırını kullanarak hedefe ping atar ve gecikme süresini (ms) döner."""
    system = platform.system().lower()
    
    # İşletim sistemine göre ping parametrelerini belirle
    if system == "windows":
        cmd = ["ping", "-n", "1", "-w", "1000", host]
    else:
        cmd = ["ping", "-c", "1", "-W", "1", host]

    try:
        start_time = time.time()
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        elapsed_time = round((time.time() - start_time) * 1000, 2)

        if result.returncode == 0:
            return True, elapsed_time
        return False, 0.0
    except Exception:
        return False, 0.0

def start_ping_of(host: str, count: int, delay: float):
    print(f"\n{CYAN}=== PingOf Ağ İzleyici ==={RESET}")
    print(f"Hedef: {YELLOW}{host}{RESET} | İstek Sayısı: {count if count > 0 else 'Sonsuz'} | Aralık: {delay}s\n")

    sent = 0
    successful = 0
    latencies = []

    try:
        while count == 0 or sent < count:
            sent += 1
            now = datetime.now().strftime("%H:%M:%S")
            success, latency = ping_host(host)

            if success:
                successful += 1
                latencies.append(latency)
                print(f"[{now}] {host} -> {GREEN}BAŞARILI{RESET} | Gecikme: {GREEN}{latency} ms{RESET}")
            else:
                print(f"[{now}] {host} -> {RED}ZAMAN AŞIMI (Timeout){RESET}")

            time.sleep(delay)

    except KeyboardInterrupt:
        print(f"\n{YELLOW}İşlem kullanıcı tarafından durduruldu.{RESET}")

    # İstatistik Özeti
    print(f"\n{CYAN}--- {host} İçin Ping İstatistikleri ---{RESET}")
    loss_rate = round(((sent - successful) / sent) * 100, 1) if sent > 0 else 0
    print(f"Gönderilen: {sent} | Başarılı: {successful} | Kayıp: %{loss_rate}")

    if latencies:
        avg_lat = round(sum(latencies) / len(latencies), 2)
        print(f"En Düşük: {min(latencies)} ms | En Yüksek: {max(latencies)} ms | Ortalama: {avg_lat} ms\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PingOf - Basit ve Hızlı Ping/Ağ İzleme Aracı")
    parser.add_argument("host", nargs="?", default="8.8.8.8", help="Ping atılacak IP veya alan adı (Örn: google.com)")
    parser.add_argument("-c", "--count", type=int, default=10, help="Atılacak ping sayısı (0 = sonsuz)")
    parser.add_argument("-i", "--interval", type=float, default=1.0, help="Pingler arası bekleme süresi (saniye)")

    args = parser.parse_args()
    start_ping_of(args.host, args.count, args.interval)