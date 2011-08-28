BEGIN;

DROP INDEX IF EXISTS answer_order_idx;
DROP INDEX IF EXISTS answer_ended_on_idx;
DROP INDEX IF EXISTS outcome_status_idx;
DROP INDEX IF EXISTS outcome_place_idx;
DROP INDEX IF EXISTS question_comparison_type_idx;
DROP INDEX IF EXISTS questionorder_order_idx;
DROP INDEX IF EXISTS race_started_on_idx;
DROP INDEX IF EXISTS race_type_idx;
DROP INDEX IF EXISTS race_won_by_id_idx;
DROP INDEX IF EXISTS user_screen_name_idx;
DROP INDEX IF EXISTS user_name_idx;


CREATE INDEX answer_order_idx ON quickerthanme_answer ("order");
CREATE INDEX answer_ended_on_idx ON quickerthanme_answer ("ended_on");

CREATE INDEX outcome_status_idx ON quickerthanme_outcome ("status");
CREATE INDEX outcome_place_idx ON quickerthanme_outcome ("place");

CREATE INDEX question_comparison_type_idx ON quickerthanme_question ("comparison_type");

CREATE INDEX questionorder_order_idx ON quickerthanme_questionorder ("order");

CREATE INDEX race_started_on_idx ON quickerthanme_race ("started_on");
CREATE INDEX race_type_idx ON quickerthanme_race ("type");
CREATE INDEX race_won_by_id_idx ON quickerthanme_race ("won_by_id");

CREATE INDEX user_screen_name_idx ON quickerthanme_user ("screen_name");
CREATE INDEX user_name_idx ON quickerthanme_user ("name");

COMMIT;
