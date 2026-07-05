import unittest

import server


class DialectServerTests(unittest.TestCase):
    def test_supported_languages_are_bidirectional(self):
        self.assertEqual(
            server.ALLOWED_LANGUAGES,
            {"python", "javascript", "java", "cpp", "rust"},
        )

    def test_demo_translation_matches_known_function(self):
        result = server.demo_translate(
            "def two_sum(nums, target):\n    return []", "python", "cpp"
        )
        self.assertEqual(result["translation_id"], "two_sum")
        self.assertIn("std::vector<int> two_sum", result["code"])

    def test_unknown_source_is_not_guessed(self):
        result = server.demo_translate("def unknown():\n    pass", "python", "cpp")
        self.assertIsNone(result["translation_id"])
        self.assertIn("Source preserved for review", result["code"])

    def test_static_analysis_flags_numeric_bounds(self):
        analysis = server.analyze_translation(
            "def f(x): return x + 1",
            "long long f(long long x) { return x + 1; }",
            "python",
            "cpp",
        )
        self.assertTrue(
            any(risk["title"] == "Numeric bounds changed" for risk in analysis["risks"])
        )

    def test_verifier_rejects_edited_output(self):
        result = server.verify_demo_translation("fibonacci", "// modified")
        self.assertFalse(result["compiled"])
        self.assertTrue(result["modified"])

    def test_model_json_parser_accepts_wrapped_json(self):
        parsed = server.parse_translation_json(
            'Result:\n```json\n{"code":"int main() {}","changes":[],"assumptions":[]}\n```'
        )
        self.assertEqual(parsed["code"], "int main() {}")

    def test_chat_prompt_contains_translation_context(self):
        prompt = server.build_chat_prompt(
            {
                "question": "Why is this type used?",
                "context": {
                    "source_language": "python",
                    "target_language": "cpp",
                    "source_code": "def f(): pass",
                    "target_code": "void f() {}",
                    "changes": [],
                    "assumptions": [],
                    "analysis": {},
                    "tests": [],
                },
                "history": [],
            }
        )
        self.assertIn("void f() {}", prompt)
        self.assertIn("Why is this type used?", prompt)

    def test_all_bundled_translations_compile_and_pass(self):
        if not server.shutil.which("clang++"):
            self.skipTest("clang++ is not available")
        for translation_id, translation in server.DEMO_TRANSLATIONS.items():
            with self.subTest(translation_id=translation_id):
                result = server.verify_demo_translation(
                    translation_id, translation["code"]
                )
                self.assertTrue(result["compiled"], result.get("message"))
                self.assertTrue(all(test["passed"] for test in result["results"]))


if __name__ == "__main__":
    unittest.main()
