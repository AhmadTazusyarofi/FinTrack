-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 03 Agu 2026 pada 07.26
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `finance_tracker`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `accounts`
--

CREATE TABLE `accounts` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `accounts`
--

INSERT INTO `accounts` (`id`, `user_id`, `name`, `balance`, `created_at`) VALUES
('382d5055-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'BCA', 4937800.00, '2026-07-14 16:13:04'),
('382d6199-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Mandiri', 3000000.00, '2026-07-14 16:13:04'),
('382d6275-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'BRI', 2000000.00, '2026-07-14 16:13:04'),
('382d62e7-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'BNI', 1500000.00, '2026-07-14 16:13:04'),
('382d635a-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'GoPay', 500000.00, '2026-07-14 16:13:04'),
('382d63e0-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'OVO', 300000.00, '2026-07-14 16:13:04'),
('382d6455-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Dana', 200000.00, '2026-07-14 16:13:04'),
('382d64be-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Tunai', 1000000.00, '2026-07-14 16:13:04'),
('499d77c4-7fc0-4237-a3f4-d0e899fc7f3e', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Rekening Utama', 0.00, '2026-07-16 01:37:35'),
('6639a60b-c5cc-47a5-aeaf-f7e95af37b36', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Rekening Utama', 0.00, '2026-07-15 17:56:27');

-- --------------------------------------------------------

--
-- Struktur dari tabel `budgets`
--

CREATE TABLE `budgets` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `category_id` char(36) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `month` tinyint(4) NOT NULL COMMENT '1-12',
  `year` smallint(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `budgets`
--

INSERT INTO `budgets` (`id`, `user_id`, `category_id`, `amount`, `month`, `year`) VALUES
('2805ed54-7ba0-4968-be25-01a44930e8c8', '1de4b890-7723-46fb-9080-ce116eb2eed4', '3829acf2-7f64-11f1-89b0-18cf5ef66882', 100000.00, 7, 2026),
('37bb7379-ec77-41cf-91e1-913fb9e4b8ff', '1de4b890-7723-46fb-9080-ce116eb2eed4', '3829aba7-7f64-11f1-89b0-18cf5ef66882', 200000.00, 7, 2026),
('9f238ef0-85d1-4ad4-844c-375407dbb94f', '1de4b890-7723-46fb-9080-ce116eb2eed4', '3829ad66-7f64-11f1-89b0-18cf5ef66882', 100000.00, 7, 2026),
('ba072524-c141-4d42-8b9d-adcfd3fe6645', '1de4b890-7723-46fb-9080-ce116eb2eed4', '3829ade4-7f64-11f1-89b0-18cf5ef66882', 200000.00, 7, 2026);

-- --------------------------------------------------------

--
-- Struktur dari tabel `categories`
--

CREATE TABLE `categories` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('INCOME','EXPENSE') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `categories`
--

INSERT INTO `categories` (`id`, `user_id`, `name`, `type`, `created_at`) VALUES
('0ec8dcdf-be00-43e4-9088-22c4098ec393', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Belanja', 'EXPENSE', '2026-07-15 17:56:27'),
('0f68cb88-a7d3-4d85-9801-ca1d6cb50af9', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Hiburan', 'EXPENSE', '2026-07-15 17:56:27'),
('1184fdac-08bb-46e9-8b82-d4a9b9742231', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Transport', 'EXPENSE', '2026-07-16 01:37:35'),
('180cb366-9961-43cf-9f15-21b2aea2e46f', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Transport', 'EXPENSE', '2026-07-15 17:56:27'),
('28fdd55d-9aaf-4bfe-a125-54868788392f', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Gaji', 'INCOME', '2026-07-15 17:56:27'),
('3368e69c-2975-4a0e-800f-d53f1562a54f', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Freelance', 'INCOME', '2026-07-16 01:37:35'),
('349d73d6-e5a7-4978-ba12-d8d1ecbf0739', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Piutang', 'INCOME', '2026-07-17 22:26:47'),
('3829a7b0-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Freelance', 'INCOME', '2026-07-14 16:13:04'),
('3829a92c-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Bisnis', 'INCOME', '2026-07-14 16:13:04'),
('3829a9cd-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Investasi', 'INCOME', '2026-07-14 16:13:04'),
('3829aa58-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Hadiah', 'INCOME', '2026-07-14 16:13:04'),
('3829ab0b-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Lainnya', 'INCOME', '2026-07-14 16:13:04'),
('3829aba7-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Makanan & Minuman', 'EXPENSE', '2026-07-14 16:13:04'),
('3829acf2-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Hiburan', 'EXPENSE', '2026-07-14 16:13:04'),
('3829ad66-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Kesehatan', 'EXPENSE', '2026-07-14 16:13:04'),
('3829ade4-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Belanja', 'EXPENSE', '2026-07-14 16:13:04'),
('3829ae58-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Tagihan', 'EXPENSE', '2026-07-14 16:13:04'),
('3829aef6-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Pendidikan', 'EXPENSE', '2026-07-14 16:13:04'),
('382a0dd7-7f64-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Lainnya', 'EXPENSE', '2026-07-14 16:13:04'),
('39315d2a-5d06-4a89-8571-8bc5bf801270', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Makanan & Minuman', 'EXPENSE', '2026-07-16 01:37:35'),
('3ac4eb23-4d17-4ea9-9f42-81b26a5e46e8', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Bisnis', 'INCOME', '2026-07-16 01:37:35'),
('3d01427a-8ff1-47e5-bac2-a30b23413b85', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Makanan & Minuman', 'EXPENSE', '2026-07-15 17:56:27'),
('3fa3bbcc-7f58-11f1-89b0-18cf5ef66882', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Gaji', 'INCOME', '2026-07-14 14:47:22'),
('4d772e72-4069-407c-a41a-8e76a78d6b08', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Investasi', 'INCOME', '2026-07-15 17:56:27'),
('4fd05991-f1be-409d-b346-3681ceee2efc', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Freelance', 'INCOME', '2026-07-15 17:56:27'),
('56a1e660-bc64-4892-8a7a-7fad3a624eea', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Pendidikan', 'EXPENSE', '2026-07-16 01:37:35'),
('613d2322-b938-4bca-9d51-46396076f581', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Kesehatan', 'EXPENSE', '2026-07-16 01:37:35'),
('734ea3ca-7c3a-4f7d-937a-b571873f8a15', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Lainnya', 'EXPENSE', '2026-07-16 01:37:35'),
('8023473c-304c-4afc-8364-43d76e050050', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'hahaha', 'INCOME', '2026-07-16 17:42:31'),
('92fe78b2-c920-44d2-99af-b30a50e5bc07', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Hadiah', 'INCOME', '2026-07-15 17:56:27'),
('95fa34b9-c3ff-4b95-a5e2-f431d5a84aad', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Tagihan', 'EXPENSE', '2026-07-15 17:56:27'),
('9a05a04f-11ff-45d7-a639-81f08452c77a', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Hutang', 'EXPENSE', '2026-07-17 22:11:47'),
('9a35448a-c38d-42f2-a79b-0c0929ee7020', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Lainnya', 'INCOME', '2026-07-15 17:56:27'),
('9f895acb-da1f-424b-a944-f115f94fa339', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Kesehatan', 'EXPENSE', '2026-07-15 17:56:27'),
('a41ada10-c0f7-45f9-b323-d1522bbded71', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Belanja', 'EXPENSE', '2026-07-16 01:37:35'),
('ad7de94e-5f6b-4c83-b7a5-dafc8f90ec96', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Bisnis', 'INCOME', '2026-07-15 17:56:27'),
('b3dbf0a6-0371-4ab4-9896-9cb0a3eed1fa', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Tagihan', 'EXPENSE', '2026-07-16 01:37:35'),
('b4b63534-22dd-4fbd-b59c-be61a14f17c8', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Gaji', 'INCOME', '2026-07-16 01:37:35'),
('c9a7d079-8a12-404c-9cf7-79bb8a77f1e1', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Pendidikan', 'EXPENSE', '2026-07-15 17:56:27'),
('ca24f4f0-3cde-437f-b117-73db9b51e9f9', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Investasi', 'INCOME', '2026-07-16 01:37:35'),
('ca8022ef-6212-4bbb-b295-1f41fd74f982', '77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'Lainnya', 'EXPENSE', '2026-07-15 17:56:27'),
('e25a0dd3-486f-4330-b891-1e9084862365', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Hiburan', 'EXPENSE', '2026-07-16 01:37:35'),
('e8c09942-50a0-4813-bfb5-23b9e234ea02', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Lainnya', 'INCOME', '2026-07-16 01:37:35'),
('fc77fab6-3ba0-41f0-b272-6d19665ea3da', 'eb3eb057-2eea-489e-ae11-be9b04f39570', 'Hadiah', 'INCOME', '2026-07-16 01:37:35');

-- --------------------------------------------------------

--
-- Struktur dari tabel `debts`
--

CREATE TABLE `debts` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `type` enum('PAYABLE','RECEIVABLE') NOT NULL,
  `person_name` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `due_date` date DEFAULT NULL,
  `note` text DEFAULT NULL,
  `status` enum('ACTIVE','SETTLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `debts`
--

INSERT INTO `debts` (`id`, `user_id`, `type`, `person_name`, `amount`, `paid_amount`, `due_date`, `note`, `status`, `created_at`, `updated_at`) VALUES
('7bf29195-caec-42e2-8c1a-f78e20cdfc46', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'PAYABLE', 'Test 2', 100000.00, 20000.00, '2026-07-31', NULL, 'ACTIVE', '2026-07-19 23:02:20', '2026-07-19 23:02:35'),
('7ed81aa6-c756-442c-b46c-da6a400832f0', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'RECEIVABLE', 'Test 2', 1000000.00, 0.00, '2026-08-02', NULL, 'ACTIVE', '2026-07-19 23:03:29', '2026-07-19 23:03:29'),
('bef0d785-860d-4cba-95a3-1184e9b82984', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'PAYABLE', 'Test 1', 100000.00, 0.00, '2026-07-20', NULL, 'ACTIVE', '2026-07-19 23:02:04', '2026-07-19 23:02:04'),
('ef77caa9-64c1-43d8-ba66-8ae9de33536f', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'RECEIVABLE', 'Test 1', 200000.00, 50000.00, '2026-07-20', NULL, 'ACTIVE', '2026-07-19 23:02:56', '2026-07-19 23:03:09');

-- --------------------------------------------------------

--
-- Struktur dari tabel `debt_payments`
--

CREATE TABLE `debt_payments` (
  `id` char(36) NOT NULL,
  `debt_id` char(36) NOT NULL,
  `account_id` char(36) NOT NULL,
  `transaction_id` char(36) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `date` date NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `debt_payments`
--

INSERT INTO `debt_payments` (`id`, `debt_id`, `account_id`, `transaction_id`, `amount`, `date`, `note`, `created_at`) VALUES
('e1bd5ff4-4fa7-427f-af87-8795cf5ac502', '7bf29195-caec-42e2-8c1a-f78e20cdfc46', '382d5055-7f64-11f1-89b0-18cf5ef66882', 'd58d7bd5-8671-4aa2-b6ac-4b069c4184a5', 20000.00, '2026-07-19', NULL, '2026-07-19 23:02:35'),
('f5b94427-89db-4ebd-a90d-ac3f472a007e', 'ef77caa9-64c1-43d8-ba66-8ae9de33536f', '382d5055-7f64-11f1-89b0-18cf5ef66882', '3a8b6854-9237-4033-ba95-84e9b4c86db1', 50000.00, '2026-07-19', NULL, '2026-07-19 23:03:09');

-- --------------------------------------------------------

--
-- Struktur dari tabel `transactions`
--

CREATE TABLE `transactions` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `type` enum('INCOME','EXPENSE') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `category_id` char(36) NOT NULL,
  `account_id` char(36) NOT NULL,
  `date` date NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `type`, `amount`, `category_id`, `account_id`, `date`, `note`, `created_at`, `updated_at`) VALUES
('00ad9ed4-f939-46e5-87b7-1535a70a9bf8', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'EXPENSE', 36500.00, '3829aba7-7f64-11f1-89b0-18cf5ef66882', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-19', 'Beli Indomie, Hemiviton, Nuvo, Oreo — Indomaret', '2026-07-19 22:51:57', '2026-07-19 22:51:57'),
('1b47d5a1-50d0-4e4c-a795-e85294675455', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'EXPENSE', 31700.00, '3829aba7-7f64-11f1-89b0-18cf5ef66882', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-15', 'Beli susu dan cokelat — Indomaret', '2026-07-18 13:27:03', '2026-07-18 13:27:03'),
('25f049f9-2366-42f5-a962-dff71998cb0d', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'EXPENSE', 24000.00, '3829aba7-7f64-11f1-89b0-18cf5ef66882', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-18', 'Y/C GO PALM SUGAR — Indomaret', '2026-07-18 13:33:36', '2026-07-18 13:33:36'),
('3a8b6854-9237-4033-ba95-84e9b4c86db1', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'INCOME', 50000.00, '349d73d6-e5a7-4978-ba12-d8d1ecbf0739', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-19', 'Cicilan piutang - Test 1', '2026-07-19 23:03:09', '2026-07-19 23:03:09'),
('556e6d0f-9b58-4b51-8ded-e7c58cb1ff21', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'INCOME', 1000000.00, '3829a7b0-7f64-11f1-89b0-18cf5ef66882', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-17', 'Joki', '2026-07-17 21:19:33', '2026-07-17 21:19:33'),
('6fbeab1e-8bd9-45bc-8a5f-b856c76e8adc', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'EXPENSE', 1000000.00, '382a0dd7-7f64-11f1-89b0-18cf5ef66882', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-14', 'Bayar Hutang Motor', '2026-07-15 15:15:28', '2026-07-15 18:49:05'),
('a2063c2c-16e0-4884-8f53-805235eb8dc4', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'EXPENSE', 200000.00, '3829ade4-7f64-11f1-89b0-18cf5ef66882', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-15', 'belanja makanan', '2026-07-15 23:53:40', '2026-07-15 23:53:40'),
('a5795e85-5787-429c-b2c5-8e84ec8d390f', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'INCOME', 4000000.00, '3fa3bbcc-7f58-11f1-89b0-18cf5ef66882', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-14', 'Gaji Bulanan', '2026-07-14 16:13:35', '2026-07-14 16:13:35'),
('cc62b1d1-89a9-4f92-adc9-7159ae249718', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'EXPENSE', 1000000.00, '382a0dd7-7f64-11f1-89b0-18cf5ef66882', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-17', 'beli ban', '2026-07-17 21:22:40', '2026-07-17 21:22:40'),
('d58d7bd5-8671-4aa2-b6ac-4b069c4184a5', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'EXPENSE', 20000.00, '9a05a04f-11ff-45d7-a639-81f08452c77a', '382d5055-7f64-11f1-89b0-18cf5ef66882', '2026-07-19', 'Cicilan hutang - Test 2', '2026-07-19 23:02:35', '2026-07-19 23:02:35');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `foto_profil` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `foto_profil`, `created_at`, `updated_at`) VALUES
('1de4b890-7723-46fb-9080-ce116eb2eed4', 'Ahmad Tazusyarofi', 'ahmad@gmail.com', '$2a$12$dmMcSHNNuOS8ubkshR41HOS3pYRdyZYSTSo1cRvHWnOTjWImDyRm2', '/uploads/avatars/1de4b890-7723-46fb-9080-ce116eb2eed4_1784192883144.jpeg', '2026-07-08 16:23:10', '2026-07-16 16:08:03'),
('77d2775d-0d5a-4df5-9b36-3eb813b1c663', 'mrg', 'mrg@mrg.com', '$2a$12$JNmggGSPPFyP8hxatcu50eXQj.Zzml.RrE49FOEm5/voQasP221Qi', NULL, '2026-07-15 17:56:27', '2026-07-15 17:56:27'),
('eb3eb057-2eea-489e-ae11-be9b04f39570', 'Dela Risma', 'dela@gmail.com', '$2a$12$Aock5zZSVRwm2gwjQziaKONPsHCHlahX2ouH4kTEvGb8K39ZbjkRS', NULL, '2026-07-16 01:37:35', '2026-07-16 01:37:35');

-- --------------------------------------------------------

--
-- Struktur dari tabel `wishlists`
--

CREATE TABLE `wishlists` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `target_price` decimal(15,2) NOT NULL,
  `current_savings` decimal(15,2) NOT NULL DEFAULT 0.00,
  `priority` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  `notes` text DEFAULT NULL,
  `is_purchased` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `wishlists`
--

INSERT INTO `wishlists` (`id`, `user_id`, `name`, `target_price`, `current_savings`, `priority`, `notes`, `is_purchased`, `created_at`, `updated_at`, `sort_order`) VALUES
('7ff03774-1787-46b6-9bca-1282cd327e6a', '1de4b890-7723-46fb-9080-ce116eb2eed4', 'Laptop Macbook Pro', 20000000.00, 10000000.00, 'LOW', NULL, 0, '2026-07-18 17:18:58', '2026-07-18 19:58:47', 0);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `accounts_user_name` (`user_id`,`name`),
  ADD KEY `accounts_user_id` (`user_id`);

--
-- Indeks untuk tabel `budgets`
--
ALTER TABLE `budgets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `budgets_user_cat_month_year` (`user_id`,`category_id`,`month`,`year`),
  ADD KEY `budgets_user_id` (`user_id`),
  ADD KEY `budgets_category_id` (`category_id`);

--
-- Indeks untuk tabel `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categories_user_name_type` (`user_id`,`name`,`type`),
  ADD KEY `categories_user_id` (`user_id`);

--
-- Indeks untuk tabel `debts`
--
ALTER TABLE `debts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `debts_user_id` (`user_id`);

--
-- Indeks untuk tabel `debt_payments`
--
ALTER TABLE `debt_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `debt_payments_debt_id` (`debt_id`),
  ADD KEY `fk_dp_account` (`account_id`),
  ADD KEY `fk_dp_transaction` (`transaction_id`);

--
-- Indeks untuk tabel `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `transactions_user_id` (`user_id`),
  ADD KEY `transactions_user_date` (`user_id`,`date`),
  ADD KEY `transactions_category_id` (`category_id`),
  ADD KEY `transactions_account_id` (`account_id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indeks untuk tabel `wishlists`
--
ALTER TABLE `wishlists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `wishlists_user_id` (`user_id`);

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `accounts`
--
ALTER TABLE `accounts`
  ADD CONSTRAINT `fk_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `budgets`
--
ALTER TABLE `budgets`
  ADD CONSTRAINT `fk_budgets_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `fk_budgets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_categories_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `debts`
--
ALTER TABLE `debts`
  ADD CONSTRAINT `fk_debts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `debt_payments`
--
ALTER TABLE `debt_payments`
  ADD CONSTRAINT `fk_dp_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`),
  ADD CONSTRAINT `fk_dp_debt` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dp_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`),
  ADD CONSTRAINT `fk_transactions_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `wishlists`
--
ALTER TABLE `wishlists`
  ADD CONSTRAINT `fk_wishlists_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
